import Line from "framework/Line";
import Rectangle from "framework/Rectangle";
import Brush from "framework/Brush";
import SharedColors from "../ui/SharedColors";
import Selection from "framework/SelectionModel"
import NullContainer from "framework/NullContainer";
import Invalidate from "framework/Invalidate";
import ExtensionBase from "./ExtensionBase";
import DesignerView from "framework/DesignerView";
import Layer from "framework/Layer";
import PropertyMetadata from "../framework/PropertyMetadata";

var fwk = sketch.framework;
var HighlightBrush = Brush.createFromColor(SharedColors.Highlight);


class ResizeHint extends Rectangle {
    constructor() {
        super();
        this.fill(fwk.Brush.Black);
        this.opacity(0.7);
    }

    updateText(text, point) {
        this._lastPoint = point;
        this._text = text;
        Invalidate.requestUpperOnly();
    }

    drawSelf(context, w, h, environment) {
        if (!this._text) {
            return;
        }

        var scale = environment.view.scale();

        var lines = this._text.split('\n');
        var fontStyle = '12px/12px Arial';

        var measure = context.measureText(lines[0], fontStyle);
        var width = measure.width;
        if (lines.length > 1) {
            for (var i = 1; i < lines.length; ++i) {
                measure = context.measureText(lines[i], fontStyle);
                if (measure.width > width) {
                    width = measure.width;
                }
            }
        }
        context.scale(1 / scale, 1 / scale);

        var x = ~~((this._lastPoint.x + 30) * scale),
            y = ~~((this._lastPoint.y + 30) * scale);
        var l = x - 4,
            t = y - 3,
            w = width + 18,
            h = 6 + lines.length * 14;
        //this.resize({x:l, y:t, width:w, height:h});
        context.translate(l, t);
        Rectangle.prototype.drawSelf.call(this, context, w, h, environment);
        context.translate(-l, -t);

        context.textBaseline = 'top';
        context.font = fontStyle;

        if (this._lastPoint) {

            context.fillStyle = "white";
            for (var i = 0; i < lines.length; ++i) {
                context.fillText(lines[i], x, ~~y);
                y += 14;
            }
        }
    }
}

var onDraggingElement = function (event) {
    if (event.target != null && event.target.canAccept(event.element) && !(event.target instanceof Layer), event) {
        this._target = event.target !== event.element.parent() ? event.target : null;
        this._dropData = event.target.getDropData({x: event.mouseX, y: event.mouseY}, event.element);
    } else {
        this._target = null;
        this._dropData = null;
    }
    var p = event.draggingElement.position();
    if (this._target) {
        p = this._target.global2local(p);
        this._targetRect = this._target.getBoundaryRectGlobal();
    } else {
        p = event.element.parent().global2local(p);
        delete this._targetRect;
    }

    if (!this._resizing && !this._rotating) {
        this._hint.updateText("Left: " + ~~(p.x + 0.5) + "px\nTop: " + ~~(p.y + 0.5) + "px", {
            x: event.mouseX,
            y: event.mouseY
        });
    }
    updateTargetRect.call(this);
};

var onStartDragging = function () {
    this._dragging = true;
};

var onStopDragging = function (event) {
    this._dropData = null;
    this._target = null;
    delete this._targetRect;
    this._dragging = false;
    updateTargetRect.call(this);
    Invalidate.requestUpperOnly();
};

var onMouseMove = function (event) {
    this._lastPoint = event;

    if (this._dragging || this._resizing || this._rotating || !App.Current.allowSelection() || this._selection !== undefined) {
        return;
    }

    Selection.directSelectionEnabled(event.event.altKey);
    var target = this.app.activePage.hitElement(event, this.view.scale());
    Selection.directSelectionEnabled(false);
    if (this._target != target) {
        if (!Selection.isElementSelected(target)) {
            if (target.canSelect() && !target.locked() && (!target.lockedGroup || target.lockedGroup())) {
                this._target = target;
                this._targetRect = target.getBoundaryRectGlobal();
                updateTargetRect.call(this);
            } else {
                if (this._target != null) {
                    this._target = null;
                    delete this._targetRect;
                    updateTargetRect.call(this);
                }
            }

        } else if (this._target) {
            this._target = null;
            delete this._targetRect;
            updateTargetRect.call(this);
        }
    }
};

var onElementSelected = function () {
    if (this._target && Selection.isElementSelected(this._target)) {
        this._target = null;
        delete this._targetRect;
        updateTargetRect.call(this);
    }
};

function onSelectionFrame(rect) {
    var scale = this.view.scale();
    this._selection = map(this.app.activePage.getElementsInRect(rect), function (element) {
        var rect = element.getBoundaryRectGlobal();
        return {
            id: element.id(),
            rect: {x: rect.x, y: rect.y, width: ~~(rect.width * scale), height: ~~(rect.height * scale)},
            angle: element.angle()
        };
    });

    updateSelectionRects.call(this);
}

function updateSelectionRects() {
    this._selectionIteration++;
    if (!this._selectionControls) {
        this._selectionControls = {};
    }

    for (var i = 0; i < this._selection.length; ++i) {
        var selection = this._selection[i];
        var controlData = this._selectionControls[selection.id];
        if (controlData) {
            controlData.iteration = this._selectionIteration;
            controlData.control.resize(selection.rect);
        } else {
            var control = new Rectangle();
            control.setProps({
                stroke: HighlightBrush,
                fill: Brush.Empty,
                width: selection.rect.width,
                height: selection.rect.height,
                x: selection.rect.x,
                y: selection.rect.y,
                angle: selection.angle
            });

            control.crazySupported(false);
            control.hitVisible(false);
            control.scalableX(false);
            control.scalableY(false);
            control.dashPattern([1, 1]);

            this._selectionControls[selection.id] = {
                iteration: this._selectionIteration,
                control: control
            }

            this.view.layer3.add(control);
        }
    }

    // clear elements which are not selected any more
    for (var id in this._selectionControls) {
        var controlData = this._selectionControls[id];
        if (controlData.iteration !== this._selectionIteration) {
            controlData.control.parent().remove(controlData.control);
            delete this._selectionControls[id];
        }
    }
}

function onSelectionFrameStart() {
    this._selection = [];
    this._selectionIteration = 0;
}

function onSelectionFrameStop() {
    this._selection = [];
    updateSelectionRects.call(this);
    delete this._selection;
    delete this._selectionIteration;
    delete this._selectionControls;
}

function onStartResizing() {
    this._resizing = true;
    updateTargetRect.call(this);
}

function onStopResizing() {
    delete this._resizing;
    updateTargetRect.call(this);
}

function onResizing(event) {
    var rect = event.rect;
    this._hint.updateText("Width: " + ~~(rect.width + 0.5) + "px\nHeight: " + ~~(rect.height + 0.5) + "px", {
        x: event.mouseX,
        y: event.mouseY
    });
}

function onStartRotating() {
    this._rotating = true;
    updateTargetRect.call(this);
}

function onStopRotating() {
    delete this._rotating;
    updateTargetRect.call(this);
}

function onRotating(event) {
    this._hint.updateText("Angle: " + event.angle + "°", {x: event.mouseX, y: event.mouseY});
}

var appLoaded = function () {
    var controller = this.controller;
    if(!controller){
        return;
    }
    this.registerForDispose(controller.draggingEvent.bind(this, onDraggingElement));
    this.registerForDispose(controller.stopDraggingEvent.bind(this, onStopDragging));
    this.registerForDispose(controller.startResizingEvent.bind(this, onStartResizing));
    this.registerForDispose(controller.stopResizingEvent.bind(this, onStopResizing));
    this.registerForDispose(controller.resizingEvent.bind(this, onResizing));
    this.registerForDispose(controller.startRotatingEvent.bind(this, onStartRotating));
    this.registerForDispose(controller.stopRotatingEvent.bind(this, onStopRotating));
    this.registerForDispose(controller.rotatingEvent.bind(this, onRotating));
    this.registerForDispose(controller.startDraggingEvent.bind(this, onStartDragging));
    this.registerForDispose(controller.mousemoveEvent.bind(this, onMouseMove));
    this.registerForDispose(Selection.onElementSelected.bind(this, onElementSelected));
    this.registerForDispose(Selection.onSelectionFrameEvent.bind(this, onSelectionFrame));
    this.registerForDispose(Selection.startSelectionFrameEvent.bind(this, onSelectionFrameStart));
    this.registerForDispose(Selection.stopSelectionFrameEvent.bind(this, onSelectionFrameStop));
    this.registerForDispose(this.app.actionManager.subscribe('cancel', EventHandler(this, onCancel)));
    this.app.releaseLoadRef();
};

var onCancel = function () {
    if (this._target) {
        this._target = null;
        delete this._targetRect;
        updateTargetRect.call(this);
    }
};

function updateTargetRect() {
    var data = this._dropData;
    if (data) {
        if (this._dropLine.parent() === NullContainer) {
            this.view.layer3.add(this._dropLine);
        }
        this._dropLine.x1(data.x1);
        this._dropLine.x2(data.x2);
        this._dropLine.y1(data.y1);
        this._dropLine.y2(data.y2);
        this._dropLine.angle(data.angle);
    } else if (!(this._dropLine.parent() === NullContainer)) {
        this._dropLine.parent().remove(this._dropLine);
    }

    if (this._dragging || this._resizing || this._rotating) {
        if (this._hint.parent() === NullContainer) {
            this.view.layer3.add(this._hint);
        }
    } else if (!(this._hint.parent() === NullContainer)) {
        this._hint.parent().remove(this._hint);
    }

    var target = this._target;
    Invalidate.requestUpperOnly();
}


export default class DropVisualization extends ExtensionBase {
    attach(app, view, controller) {
        if(!(view instanceof DesignerView)){
            return;
        }
        super.attach.apply(this, arguments);
        app.loaded.then(appLoaded.bind(this));
        this.registerForDispose(view.scaleChanged.bind(EventHandler(this, updateTargetRect)));
        app.addLoadRef();
        this._dropLine = new Line();
        this._dropLine.setProps({
            stroke: fwk.Brush.createFromColor("red")
        });
        this._dropLine.crazySupported(false);
        this._dropLine.hitVisible(false);

        this._hint = new ResizeHint();
        this._hint.crazySupported(false);
        this._hint.hitVisible(false);

        view.registerForLayerDraw(2, this);
    }

    detach() {
        this.view && this.view.unregisterForLayerDraw(2, this);
        super.detach();
    }

    onLayerDraw(layer, context) {
        var target = this._target || this.view._highlightTarget;
        if (target) {
            DropVisualization.highlightElement(this.view, context, target);
        }
    }

    static highlightElement(view, context, element) {
        context.save();

        var matrix = element.globalViewMatrix();
        matrix.applyToContext(context);

        context.beginPath();
        if (element.drawPath) {
            element.drawPath(context, element.width(), element.height(), {});
        } else {
            var rect = element.getBoundaryRect();
            context.rectPath(0, 0, rect.width, rect.height, false);
        }
        var mutltiplier = 3 / view.scale();
        fwk.Brush.stroke(HighlightBrush, context, 0, 0, 0, 0, mutltiplier);
        context.restore();
    }
}

