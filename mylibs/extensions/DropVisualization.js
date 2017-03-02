import Line from "framework/Line";
import Rectangle from "framework/Rectangle";
import UIElement from "framework/UIElement";
import Brush from "framework/Brush";
import SharedColors from "../ui/SharedColors";
import Selection from "framework/SelectionModel"
import NullContainer from "../framework/NullContainer";
import Invalidate from "framework/Invalidate";
import ExtensionBase from "./ExtensionBase";
import DesignerView from "framework/DesignerView";
import Layer from "framework/Layer";
import Container from "../framework/Container";
import Environment from "../environment";
import GlobalMatrixModifier from "../framework/GlobalMatrixModifier";
import { ITransformationElement, ITransformationEventData, IPoint, IKeyboardState } from "../framework/CoreModel";
import UserSettings from "../UserSettings";
import Point from "../math/point";
import Matrix from "../math/matrix";
import { ChangeMode, FloatingPointPrecision } from "../framework/Defs";

var HighlightBrush = Brush.createFromColor(SharedColors.Highlight);

class ResizeHint extends UIElement {
    _transformationElement: ITransformationElement;

    constructor() {
        super();
        this._text = "";
        this._textWidth = -1;
        this._totalWidth = -1;
        this._hasDecimals = false;
        this._transformationElement = null;
    }

    start(transformationElement: ITransformationElement){
        this._transformationElement = transformationElement;

    }
    stop(){
        this._hasDecimals = false;
        this._transformationElement = null;
        this._text = "";
        this._textWidth = -1;
    }

    _updatePosition(): void{
        var anchorElement: UIElement = this._transformationElement;
        if (anchorElement.elements.length === 1 && !anchorElement.wrapSingleChild()){
            //rotated elements are not wrapped when dragging
            anchorElement = this._transformationElement.children[0];
        }

        var points = this._findBestPoints(anchorElement);
        var p0 = points[0];
        var p1 = points[1];
        var matrix = Matrix.create();
        matrix.translate(p0.x, p0.y + this._findMaxOuterBorder());

        var v1 = p1.subtract(p0);
        matrix.rotate(-v1.getDirectedAngle(Point.BasisX));

        this.setProps({width: p1.getDistance(p0), m: matrix}, ChangeMode.Self);
    }

    _findBestPoints(element: UIElement): Point[]{
        var result = [];

        var gm = element.globalViewMatrix();
        var br = element.getBoundaryRect();
        var p1 = gm.transformPoint2(br.x, br.y);
        var p2 = gm.transformPoint2(br.x + br.width, br.y);
        var p3 = gm.transformPoint2(br.x + br.width, br.y + br.height);
        var p4 = gm.transformPoint2(br.x, br.y + br.height);

        var points = [p1, p2, p3, p4];
        var lowestIdx = 0;
        for (var i = 1; i < points.length; ++i){
            if (points[i].y > points[lowestIdx].y){
                lowestIdx = i;
            }
        }

        var lowestPoint = points[lowestIdx];
        var other1 = lowestIdx === 0 ? points[points.length - 1] : points[lowestIdx - 1];
        var other2 = lowestIdx === points.length - 1 ? points[0] : points[lowestIdx + 1];

        var v1 = other1.subtract(lowestPoint);
        var v2 = other2.subtract(lowestPoint);
        var other = Math.round(v1.getAngle(Point.BasisY)) < Math.round(v2.getAngle(Point.BasisY)) ? other1 : other2;

        if (other.x < lowestPoint.x){
            result.push(other, lowestPoint);
        }
        else{
            result.push(lowestPoint, other);
        }

        return result;
    }

    _findMaxOuterBorder(): number{
        var border = 0;
        for (let i = 0; i < this._transformationElement.elements.length; ++i){
            let element = this._transformationElement.elements[i];
            border = Math.max(border, element.getMaxOuterBorder());
        }
        return border;
    }

    updateSizeText(){
        var w = this._roundDecimal(this._transformationElement.width());
        var h = this._roundDecimal(this._transformationElement.height());
        this.updateText(this._formatDecimal(w) + " x " + this._formatDecimal(h));
    }

    updatePositionText(){
        var x = this._roundDecimal(this._transformationElement.x());
        var y = this._roundDecimal(this._transformationElement.y());
        this.updateText("(" + this._formatDecimal(x) + "; " + this._formatDecimal(y) + ")");
    }

    updateAngleText(){
        var angle = this._roundDecimal(this._transformationElement.angle());
        this.updateText(angle + "°");
    }

    _formatDecimal(number: number): string{
        var suffix = "";
        var isDecimal = number % 1 !== 0;
        if (isDecimal){
            this._hasDecimals = true;
        }
        if (this._hasDecimals && !isDecimal){
            suffix = ".0";
        }
        return number + suffix;
    }
    _roundDecimal(value: number): number{
        return Math.round(value * FloatingPointPrecision) / FloatingPointPrecision;
    }

    updateText(text) {
        this._text = text;
        this._textWidth = -1;

        this._updatePosition();

        Invalidate.requestUpperOnly();
    }

    drawSelf(context, w, h, environment) {
        if (!this._text) {
            return;
        }

        var scale = environment.view.scale();
        var fontStyle = '10px Arial';

        GlobalMatrixModifier.pushPrependScale();

        context.save();
        context.scale(1/scale, 1/scale);
        context.fillStyle = UserSettings.frame.stroke;
        context.textBaseline = 'top';
        context.font = fontStyle;
        context.fillStyle = UserSettings.frame.stroke;

        if (this._textWidth === -1){
            this._textWidth = context.measureText(this._text, fontStyle).width;
        }

        context.fillText(this._text, Math.round((this.props.width * scale - this._textWidth)/2), Math.round(5 * scale));

        context.restore();

        GlobalMatrixModifier.pop();
    }

    hitVisible() {
        return false;
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
        context.setLineDash([1/scale, 1/scale]);
        context.beginPath();

        if (this._element.hasPath()) {
            this._element.applyViewMatrix(context);
            this._element.drawPath(context, this._element.width(), this._element.height());
        }
        else {
            this._element.drawBoundaryPath(context);
        }

        context.lineWidth = 1/scale;
        Brush.stroke(HighlightBrush, context);

        context.restore();
    }

    hitVisible() {
        return false;
    }
}

var onDraggingElement = function (event: ITransformationEventData, keys: IKeyboardState) {
    if (event.transformationElement.showResizeHint()) {
        this._hint.updatePositionText();
    }

    if (event.transformationElement.isDropSupported()
        && event.target != null
        && event.target.canAccept(event.draggingElement.elements, false, keys.ctrl)
        && !(event.target instanceof Layer)
        && event.transformationElement.allHaveSameParent()
    ) {
        this._target = event.target !== event.transformationElement.elements[0].parent() ? event.target : null;
        this._dropData = event.target.getDropData({ x: event.mouseX, y: event.mouseY }, event.transformationElement);
        this._isDropTarget = true;
    } else {
        this._target = null;
        this._dropData = null;
    }

    updateVisualizations.call(this);
};

var onStartDragging = function (event: ITransformationEventData) {
    this._dragging = true;
    this._target = null;
    this._hint.start(event.transformationElement);
    this._hint.updatePositionText();
};

var onStopDragging = function (event) {
    this._dropData = null;
    this._target = null;
    this._isDropTarget = false;
    this._dragging = false;
    this._hint.stop();
    updateVisualizations.call(this);
    Invalidate.requestUpperOnly();
};

var onMouseMove = function (event) {
    if (this._dragging || this._resizing || this._rotating || !App.Current.allowSelection() || this._selection !== undefined) {
        return;
    }

    var target = this.app.activePage.hitElement(event, this.view.scale(), null, Selection.directSelectionEnabled());
    if (this._target !== target) {
        //special case - do not highlight children of active group even though they are hit visible
        if (target && !event.ctrlKey && target.parent() instanceof Container && target.parent().activeGroup()) {
            target = target.parent();
        }

        if (target) {
            if (!Selection.isElementSelected(target)) {
                if (target.canSelect() && !target.locked() && (!target.lockedGroup || target.lockedGroup())) {
                    this._target = target;
                    this._isDropTarget = false;
                    updateVisualizations.call(this);
                } else {
                    if (this._target != null) {
                        this._target = null;
                        updateVisualizations.call(this);
                    }
                }

            }
            else if (this._target) {
                this._target = null;
                updateVisualizations.call(this);
            }
        }
    }
};

var onElementSelected = function () {
    if (this._target && Selection.isElementSelected(this._target)) {
        this._target = null;
        updateVisualizations.call(this);
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

function onStartResizing(event: ITransformationEventData) {
    this._resizing = true;
    this._hint.start(event.transformationElement);
    this._hint.updateSizeText();
    updateVisualizations.call(this);
}

function onStopResizing() {
    delete this._resizing;
    this._hint.stop();
    updateVisualizations.call(this);
}

function onResizing(event: ITransformationEventData) {
    if (event.element.showResizeHint()) {
        this._hint.updateSizeText();
    }
}

function onStartRotating(event: ITransformationEventData) {
    this._rotating = true;
    this._hint.start(event.transformationElement);
    this._hint.updateAngleText();
    updateVisualizations.call(this);
}

function onStopRotating() {
    delete this._rotating;
    this._hint.stop();
    updateVisualizations.call(this);
}

function onRotating(event: ITransformationEventData) {
    if (event.element.showResizeHint()) {
        this._hint.updateAngleText();
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
        updateVisualizations.call(this);
    }
};

function updateVisualizations() {
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

    Invalidate.requestUpperOnly();
}


export default class DropVisualization extends ExtensionBase {
    attach(app, view, controller) {
        if (!(view instanceof DesignerView)) {
            return;
        }
        super.attach.apply(this, arguments);
        app.loaded.then(appLoaded.bind(this));
        this.registerForDispose(view.scaleChanged.bind(EventHandler(this, updateVisualizations)));
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
            DropVisualization.highlightElement(this.view, context, target, this._isDropTarget);
        }
    }

    static highlightElement(view, context, element, boundaryPath = false) {
        context.save();

        context.beginPath();
        if (element.hasPath() && !boundaryPath) {
            element.applyViewMatrix(context);
            element.drawPath(context, element.width(), element.height());
        } else {
            element.drawBoundaryPath(context);
        }

        context.lineWidth = 2 / view.scale();
        Brush.stroke(HighlightBrush, context);
        context.restore();
    }
}

