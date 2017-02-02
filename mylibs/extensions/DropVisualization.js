import Line from "framework/Line";
import Rectangle from "framework/Rectangle";
import UIElement from "framework/UIElement";
import Brush from "framework/Brush";
import SharedColors from "../ui/SharedColors";
import Selection from "framework/SelectionModel"
import NullContainer from "framework/NullContainer";
import Invalidate from "framework/Invalidate";
import ExtensionBase from "./ExtensionBase";
import DesignerView from "framework/DesignerView";
import Layer from "framework/Layer";
import Container from "../framework/Container";
import Environment from "../environment";
import GlobalMatrixModifier from "../framework/GlobalMatrixModifier";

var HighlightBrush = Brush.createFromColor(SharedColors.Highlight);

class ResizeHint extends Rectangle {
    constructor() {
        super();
        this.fill(Brush.Black);
        this.opacity(0.7);
    }

    hitVisible() {
        return false;
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
        var fontStyle = '10px/10px Arial';

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

        var x = ~~((this._lastPoint.x) * scale) + 30,
            y = ~~((this._lastPoint.y) * scale) + 30;
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

class DropLine extends Line {
    hitVisible() {
        return false;
    }
}

class SelectionRect extends UIElement {
    _element: UIElement;

    constructor(element) {
        super();
        this._element = element;
    }

    drawSelf(context) {
        var scale = Environment.view.scale();

        context.save();
        context.scale(1 / scale, 1 / scale);
        context.setLineDash([1, 1]);
        context.beginPath();
        
        try {
            GlobalMatrixModifier.pushPrependScale();

            if (this._element.drawPath) {
                this._element.applyViewMatrix(context);
                this._element.drawPath(context, this._element.width(), this._element.height());
            } 
            else {
                this._element.drawBoundaryPath(context);
            }
        }
        finally {
            GlobalMatrixModifier.pop();
        }

        Brush.stroke(HighlightBrush, context);

        context.restore();
    }

    hitVisible() {
        return false;
    }
}

var onDraggingElement = function (event) {
    //TODO:
    return;
    if (event.draggingElement.isDropSupported() && event.target != null && event.target.canAccept(event.draggingElement.elements) && !(event.target instanceof Layer), event) {
        this._target = event.target !== event.element.parent() ? event.target : null;
        this._dropData = event.target.getDropData({ x: event.mouseX, y: event.mouseY }, event.element);
    } else {
        this._target = null;
        this._dropData = null;
    }
    var p = event.draggingElement.position();
    if (event.element.showDropTarget() && this._target) {
        if (this._target instanceof Container) {
            p = this._target.global2local(p);
        }
        this._targetRect = this._target.getBoundaryRectGlobal();
    } else {
        p = event.element.parent().global2local(p);
        delete this._targetRect;
    }

    if (!this._resizing && !this._rotating) {
        if (event.element.showResizeHint()) {
            this._hint.updateText("Left: " + ~~(p.x + 0.5) + "px\nTop: " + ~~(p.y + 0.5) + "px", {
                x: event.mouseX,
                y: event.mouseY
            });
        }
        else {
            this._hint.updateText(null, null);
        }
    }
    updateTargetRect.call(this);
};

var onStartDragging = function () {
    this._dragging = true;
    this._target = null;
    delete this._targetRect;
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

    var target = this.app.activePage.hitElement(event, this.view.scale(), null, event.ctrlKey);
    if (this._target !== target) {
        //special case - do not highlight children of active group even though they are hit visible
        if (target && !event.ctrlKey && target.parent() instanceof Container && target.parent().activeGroup()) {
            target = target.parent();
        }

        if (target) {
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

            }
            else if (this._target) {
                this._target = null;
                delete this._targetRect;
                updateTargetRect.call(this);
            }
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
    this._selection = this.app.activePage.getElementsInRect(rect);

    updateSelectionRects.call(this);
}

function updateSelectionRects() {
    this._selectionIteration++;
    if (!this._selectionControls) {
        this._selectionControls = {};
    }

    for (var i = 0; i < this._selection.length; ++i) {
        var element = this._selection[i];
        var controlData = this._selectionControls[element.id()];
        if (controlData) {
            controlData.iteration = this._selectionIteration;
        } else {
            var control = new SelectionRect(element);

            this._selectionControls[element.id()] = {
                iteration: this._selectionIteration,
                control: control
            };

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
    if (event.element.showResizeHint()) {
        this._hint.updateText("Width: " + ~~(rect.width + 0.5) + "px\nHeight: " + ~~(rect.height + 0.5) + "px", {
            x: event.mouseX,
            y: event.mouseY
        });
    }
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
    if (event.element.showResizeHint()) {
        this._hint.updateText("Angle: " + event.angle + "°", { x: event.mouseX, y: event.mouseY });
    }
}

var appLoaded = function () {
    var controller = this.controller;
    if (!controller) {
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
        if (!(view instanceof DesignerView)) {
            return;
        }
        super.attach.apply(this, arguments);
        app.loaded.then(appLoaded.bind(this));
        this.registerForDispose(view.scaleChanged.bind(EventHandler(this, updateTargetRect)));
        app.addLoadRef();
        this._dropLine = new DropLine();
        this._dropLine.setProps({
            stroke: Brush.createFromColor("red")
        });
        this._dropLine.crazySupported(false);

        this._hint = new ResizeHint();
        this._hint.crazySupported(false);

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

        context.beginPath();
        if (element.hasPath()) {
            element.applyViewMatrix(context);
            element.drawPath(context, element.width(), element.height());
        } else {
            element.drawBoundaryPath(context);
        }

        var mutltiplier = 2 / view.scale();
        Brush.stroke(HighlightBrush, context, 0, 0, 0, 0, mutltiplier);
        context.restore();
    }
}

