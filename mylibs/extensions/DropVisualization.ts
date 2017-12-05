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
import Page from "../framework/Page";
import Text from "../framework/text/Text";
import Environment from "../environment";
import GlobalMatrixModifier from "../framework/GlobalMatrixModifier";
import { IPoint, KeyboardState } from "carbon-core";
import UserSettings from "../UserSettings";
import Point from "../math/point";
import Matrix from "../math/matrix";
import { FloatingPointPrecision, ArrangeStrategies } from "../framework/Defs";
import { LayerType } from "carbon-app";
import { InteractionType, IUIElement, ChangeMode, IIsolationLayer, IMouseEventData, IController, IComposite, IContainer, TextMode, RenderEnvironment } from "carbon-core";
import BoundaryPathDecorator, { HighlightKind } from "../decorators/BoundaryPathDecorator";

var HighlightBrush = Brush.createFromColor(SharedColors.Highlight);

class ResizeHint extends UIElement {
    private _transformationElement: IComposite;
    private _label: Text = null;

    constructor() {
        super();
        this._text = "";
        this._textWidth = -1;
        this._totalWidth = -1;
        this._hasDecimals = false;
        this._transformationElement = null;
    }

    allowCaching() {
        return false;
    }

    start(transformationElement: IComposite) {
        this._transformationElement = transformationElement;
        if (this._transformationElement.elements.length === 1) {
            let element = this._transformationElement.elements[0];
            if (element instanceof Text && element.props.mode === TextMode.Label) {
                this._label = element;
            }
        }

    }
    stop() {
        this._hasDecimals = false;
        this._transformationElement = null;
        this._text = "";
        this._textWidth = -1;
        this._label = null;
    }

    _updatePosition(): void {
        var anchorElement = this._transformationElement;
        // if (anchorElement.elements.length === 1 && !anchorElement.wrapSingleChild()) {
        //     //rotated elements are not wrapped when dragging
        //     anchorElement = this._transformationElement.children[0];
        // }

        var points = this._findBestPoints(anchorElement);
        var p0 = points[0];
        var p1 = points[1];
        var matrix = Matrix.create();
        matrix.translate(p0.x, p0.y + this._findMaxOuterBorder());

        var v1 = p1.subtract(p0);
        matrix.rotate(-v1.getDirectedAngle(Point.BasisX));

        this.setProps({ width: p1.getDistance(p0), m: matrix }, ChangeMode.Self);
    }

    _findBestPoints(element: IUIElement): Point[] {
        var result = [];

        var gm = element.globalViewMatrix();
        var br = element.boundaryRect();
        var p1 = gm.transformPoint2(br.x, br.y);
        var p2 = gm.transformPoint2(br.x + br.width, br.y);
        var p3 = gm.transformPoint2(br.x + br.width, br.y + br.height);
        var p4 = gm.transformPoint2(br.x, br.y + br.height);

        var points = [p1, p2, p3, p4];
        var lowestIdx = 0;
        for (var i = 1; i < points.length; ++i) {
            if (points[i].y > points[lowestIdx].y) {
                lowestIdx = i;
            }
        }

        var lowestPoint = points[lowestIdx];
        var other1 = lowestIdx === 0 ? points[points.length - 1] : points[lowestIdx - 1];
        var other2 = lowestIdx === points.length - 1 ? points[0] : points[lowestIdx + 1];

        var v1 = other1.subtract(lowestPoint);
        var v2 = other2.subtract(lowestPoint);
        var other = Math.round(v1.getAngle(Point.BasisY)) < Math.round(v2.getAngle(Point.BasisY)) ? other1 : other2;

        if (other.x < lowestPoint.x) {
            result.push(other, lowestPoint);
        }
        else {
            result.push(lowestPoint, other);
        }

        return result;
    }

    _findMaxOuterBorder(): number {
        return this._transformationElement.getMaxOuterBorder();
        // var border = 0;
        // for (let i = 0; i < this._transformationElement.elements.length; ++i) {
        //     let element = this._transformationElement.elements[i];
        //     border = Math.max(border, element.getMaxOuterBorder());
        // }
        // return border;
    }

    updateSizeText() {
        var w = this._roundDecimal(this._transformationElement.width);
        var h = this._roundDecimal(this._transformationElement.height);
        var text = this._formatDecimal(w) + " x " + this._formatDecimal(h);

        if (this._label) {
            text += ", font " + this._label.props.font.size + "px";
        }

        this.updateText(text);
    }

    updatePositionText() {
        // var x = this._roundDecimal(this._transformationElement.x);
        // var y = this._roundDecimal(this._transformationElement.y);
        // this.updateText("(" + this._formatDecimal(x) + "; " + this._formatDecimal(y) + ")");
    }

    updateAngleText() {
        var angle = this._roundDecimal(this._transformationElement.angle);
        this.updateText(angle + "°");
    }

    updateRadiusText() {
        this.updateText("radius " + this._transformationElement.elements[0].props.cornerRadius.upperLeft + "px");
    }

    _formatDecimal(number: number): string {
        var suffix = "";
        var isDecimal = number % 1 !== 0;
        if (isDecimal) {
            this._hasDecimals = true;
        }
        if (this._hasDecimals && !isDecimal) {
            suffix = ".0";
        }
        return number + suffix;
    }
    _roundDecimal(value: number): number {
        return Math.round(value * FloatingPointPrecision) / FloatingPointPrecision;
    }

    updateText(text) {
        this._text = text;
        this._textWidth = -1;

        this._updatePosition();

        Invalidate.requestInteractionOnly();
    }

    drawSelf(context, w, h, environment: RenderEnvironment) {
        if (!this._text) {
            return;
        }

        var scale = environment.scale;
        var fontStyle = '10px Arial';

        GlobalMatrixModifier.pushPrependScale();

        context.save();
        context.scale(1 / scale, 1 / scale);
        context.fillStyle = UserSettings.frame.stroke;
        context.textBaseline = 'top';
        context.font = fontStyle;
        context.fillStyle = UserSettings.frame.stroke;

        if (this._textWidth === -1) {
            this._textWidth = context.measureText(this._text, fontStyle).width;
        }

        context.fillText(this._text, Math.round((this.props.width * scale - this._textWidth) / 2), Math.round(5));

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

    allowCaching() {
        return false;
    }

    drawSelf(context) {
        var scale = Environment.view.scale();

        context.save();
        context.setLineDash([1 / scale, 1 / scale]);
        context.beginPath();

        if (this._element.hasPath()) {
            this._element.applyViewMatrix(context);
            this._element.drawPath(context, this._element.width, this._element.height);
        }
        else {
            this._element.drawBoundaryPath(context);
        }

        context.lineWidth = 1 / scale;
        Brush.stroke(HighlightBrush, context);

        context.restore();
    }

    hitVisible() {
        return false;
    }
}

export default class DropVisualization extends ExtensionBase {
    private _hint: ResizeHint = null;

    attach(app, view, controller) {
        if (!(view instanceof DesignerView)) {
            return;
        }
        super.attach.apply(this, arguments);
        app.onLoad(this.appLoaded);
        this.registerForDispose(view.scaleChanged.bind(this, this.updateVisualizations));
        app.addLoadRef();
        this._dropLine = new DropLine();
        this._dropLine.setProps({
            stroke: Brush.createFromColor("red"),
            strokeWidth: 2
        });
        this._dropLine.crazySupported(false);

        this._hint = new ResizeHint();
        this._hint.crazySupported(false);

        view.registerForLayerDraw(LayerType.Interaction, this);
    }

    detach() {
        this.view && this.view.unregisterForLayerDraw(LayerType.Interaction, this);
        super.detach();
    }

    onLayerDraw(layer, context) {
        var target = this._target || this.view['_highlightTarget'];
        if (target) {
            DropVisualization.highlightElement(context, target, this._isDropTarget, SharedColors.Highlight);
        }
    }

    static highlightElement(context, element, boundaryPath = false, strokeStyle: string = null) {
        BoundaryPathDecorator.highlight(context, element, boundaryPath, HighlightKind.Thick, strokeStyle);
    }

    onDraggingElement(event: IMouseEventData, draggingElement: IComposite) {
        let target = Environment.controller.getCurrentDropTarget();

        if (draggingElement.showResizeHint()) {
            this._hint.updatePositionText();
        }

        this._target = null;
        this._dropData = null;

        if (target && !(target instanceof Page)) {
            let targetIsParent = draggingElement.elements.some(x => x.parent === target);
            if (!targetIsParent) {
                this._target = target;
                this._isDropTarget = true;
            }
            let container = target as IContainer;
            if (container.allowRearrange()) {
                this._dropData = container.getDropData(event, draggingElement);
            }
        }

        this.updateVisualizations();
    }

    onStartDragging(event: IMouseEventData, element: IComposite) {
        this._dragging = true;
        this._target = null;
        if (element.showResizeHint()) {
            this._hint.start(element);
            this._hint.updatePositionText();
        }
    }

    onStopDragging(event: IMouseEventData) {
        this._dropData = null;
        this._target = null;
        this._isDropTarget = false;
        this._dragging = false;
        this._hint.stop();
        this.updateVisualizations();
        Invalidate.requestInteractionOnly();
    };

    onMouseMove(event: IMouseEventData) {
        if (Environment.controller.interactionActive || !App.Current.allowSelection() || this._selection !== undefined) {
            return;
        }

        var target = this.view.hitElement(event);
        if (target === Selection.selectComposite()) {
            if (this._target) {
                this._target = null;
                this._isDropTarget = false;
                this.updateVisualizations();
            }
            return;
        }

        if (this._target !== target) {
            //special case - do not highlight children of active group even though they are hit visible
            if (target && !event.ctrlKey && target.parent instanceof Container && target.parent.activeGroup()) {
                target = target.parent;
            }

            if (target) {
                if (!Selection.isElementSelected(target)) {
                    if (target.canSelect() && !target.locked() && (!(target instanceof Container) || target.lockedGroup())) {
                        this._target = target;
                        this._isDropTarget = false;
                        this.updateVisualizations();
                    } else {
                        if (this._target !== null) {
                            this._target = null;
                            this.updateVisualizations();
                        }
                    }

                }
                else if (this._target) {
                    this._target = null;
                    this.updateVisualizations();
                }
            }
        }
    };

    onElementSelected() {
        if (this._target && Selection.isElementSelected(this._target)) {
            this._target = null;
            this.updateVisualizations();
        }
    }

    onSelectionFrame(rect) {
        var isolationLayer:any = Environment.view.getLayer(LayerType.Isolation) as IIsolationLayer;
        if(isolationLayer.isActive) {
            this._selection = isolationLayer.getElementsInRect(rect);
        } else {
            this._selection = this.app.activePage.getElementsInRect(rect);
        }

        this.updateSelectionRects();
    }

    updateSelectionRects() {
        this._selectionIteration++;
        if (!this._selectionControls) {
            this._selectionControls = {};
        }

        for (var i = 0; i < this._selection.length; ++i) {
            let element = this._selection[i];
            let controlData = this._selectionControls[element.id];
            if (controlData) {
                controlData.iteration = this._selectionIteration;
            } else {
                var control = new SelectionRect(element);

                this._selectionControls[element.id] = {
                    iteration: this._selectionIteration,
                    control: control
                };

                this.view.interactionLayer.add(control);
            }
        }

        // clear elements which are not selected any more
        for (var id in this._selectionControls) {
            var controlData = this._selectionControls[id];
            if (controlData.iteration !== this._selectionIteration) {
                controlData.control.parent.remove(controlData.control);
                delete this._selectionControls[id];
            }
        }
    }

    onSelectionFrameStart() {
        this._selection = [];
        this._selectionIteration = 0;
    }

    onSelectionFrameStop() {
        this._selection = [];
        this.updateSelectionRects();
        delete this._selection;
        delete this._selectionIteration;
        delete this._selectionControls;
    }

    onStartResizing(event: IMouseEventData, element: IComposite) {
        if (element.showResizeHint()) {
            this._hint.start(element);
            this._hint.updateSizeText();
        }
        this.updateVisualizations();
    }

    onStopResizing() {
        this._hint.stop();
        this.updateVisualizations();
    }

    onResizing(event: IMouseEventData, element: IUIElement) {
        if (element.showResizeHint()) {
            this._hint.updateSizeText();
        }
    }

    onStartRotating(event: IMouseEventData, element: IComposite) {
        this._hint.start(element);
        this._hint.updateAngleText();
        this.updateVisualizations();
    }

    onStopRotating() {
        this._hint.stop();
        this.updateVisualizations();
    }

    onRotating(event: IMouseEventData, element: IUIElement) {
        if (element.showResizeHint()) {
            this._hint.updateAngleText();
        }
    }

    onInteractionStarted(type: InteractionType, event: IMouseEventData, composite: IComposite) {
        switch (type) {
            case InteractionType.Dragging:
                this.onStartDragging(event, composite);
                break;
            case InteractionType.Resizing:
                this.onStartResizing(event, composite);
                break;
            case InteractionType.Rotation:
                this.onStartRotating(event, composite);
                break;
            case InteractionType.RadiusChange:
                if (composite.showResizeHint()) {
                    this._hint.start(composite);
                    this._hint.updateRadiusText();
                    this.updateVisualizations();
                }
                break;
        }
    }
    onInteractionProgress(type: InteractionType, event: IMouseEventData, composite: IComposite) {
        switch (type) {
            case InteractionType.Dragging:
                this.onDraggingElement(event, composite);
                break;
            case InteractionType.Resizing:
                this.onResizing(event, composite);
                break;
            case InteractionType.Rotation:
                this.onRotating(event, composite);
                break;
            case InteractionType.RadiusChange:
                if (composite.showResizeHint()) {
                    this._hint.updateRadiusText();
                    this.updateVisualizations();
                }
                break;
        }
    }
    onInteractionStopped(type: InteractionType, event: IMouseEventData, composite: IComposite) {
        switch (type) {
            case InteractionType.Dragging:
                this.onStopDragging(event);
                break;
            case InteractionType.Resizing:
                this.onStopResizing();
                break;
            case InteractionType.Rotation:
                this.onStopRotating();
                break;
            case InteractionType.RadiusChange:
                if (composite.showResizeHint()) {
                    this._hint.stop();
                }
                break;
        }
    }

    appLoaded = () => {
        var controller = this.controller as IController;
        if (!controller) {
            return;
        }

        this.registerForDispose(controller.interactionStarted.bind(this, this.onInteractionStarted));
        this.registerForDispose(controller.interactionProgress.bind(this, this.onInteractionProgress));
        this.registerForDispose(controller.interactionStopped.bind(this, this.onInteractionStopped));

        this.registerForDispose(controller.mousemoveEvent.bind(this, this.onMouseMove));
        this.registerForDispose(Selection.onElementSelected.bind(this, this.onElementSelected));
        this.registerForDispose(Selection.onSelectionFrameEvent.bind(this, this.onSelectionFrame));
        this.registerForDispose(Selection.startSelectionFrameEvent.bind(this, this.onSelectionFrameStart));
        this.registerForDispose(Selection.stopSelectionFrameEvent.bind(this, this.onSelectionFrameStop));
        this.registerForDispose(this.app.actionManager.subscribe('cancel', this.onCancel));
    }

    onCancel = () => {
        if (this._target) {
            this._target = null;
            this.updateVisualizations();
        }
    };

    updateVisualizations() {
        var data = this._dropData;
        if (data) {
            if (this._dropLine.parent === NullContainer) {
                this.view.interactionLayer.add(this._dropLine);
            }
            this._dropLine.x1(data.x1);
            this._dropLine.x2(data.x2);
            this._dropLine.y1(data.y1);
            this._dropLine.y2(data.y2);
        } else if (!(this._dropLine.parent === NullContainer)) {
            this._dropLine.parent.remove(this._dropLine);
        }

        if (Environment.controller.interactionActive) {
            if (this._hint.parent === NullContainer) {
                this.view.interactionLayer.add(this._hint);
            }
        } else if (!(this._hint.parent === NullContainer)) {
            this._hint.parent.remove(this._hint);
        }

        Invalidate.requestInteractionOnly();
    }
}

