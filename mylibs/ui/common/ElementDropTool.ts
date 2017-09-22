import SystemConfiguration from "../../SystemConfiguration";
import Selection from "../../framework/SelectionModel";
import Invalidate from "../../framework/Invalidate";
import ObjectFactory from "../../framework/ObjectFactory";
import SnapController from "../../framework/SnapController";
import Environment from "../../environment";
import Cursor from "../../framework/Cursor";
import Brush from "../../framework/Brush";
import Rect from "../../math/rect";
import Point from "../../math/point";
import Matrix from "../../math/matrix";
import UIElement from "../../framework/UIElement";
import Tool from "./Tool";

import { IMouseEventData, KeyboardState, ElementState, WorkspaceTool, InteractionType } from "carbon-core";
import BoundaryPathDecorator from "../../decorators/BoundaryPathDecorator";
require("framework/ArtboardFrame");// don't remove from here even if not used

export default class ElementDropTool extends Tool {
    [name: string]: any;

    constructor(toolId: WorkspaceTool, type, parameters?) {
        super(toolId);

        this._type = type;
        this._parameters = parameters;
        this._point = new Point(0, 0);
    }
    attach() {
        super.attach.apply(this, arguments);
        Cursor.setGlobalCursor("crosshair");
    }
    detach() {
        super.detach.apply(this, arguments);
        this._mousepressed = false;
        SnapController.clearActiveSnapLines();
        Cursor.removeGlobalCursor();

        this.changeMode(ElementState.Resize);
        this._hoverArtboard = null;
    }
    mousedown(event: IMouseEventData) {
        var eventData = { handled: false, x: event.x, y: event.y };
        Environment.controller.startDrawingEvent.raise(eventData);
        if (eventData.handled) {
            return true;
        }

        if (this._element){
            this.changeMode(ElementState.Resize);
        }

        this._mousepressed = true;
        this._prepareMousePoint(event);

        this._startPoint = { x: this._point.x, y: this._point.y };
        this._nextPoint = { x: this._point.x, y: this._point.y };
        event.handled = true;
        this._element = ObjectFactory.fromType(this._type);
        App.Current.activePage.nameProvider.assignNewName(this._element);
        this._cursorNotMoved = true;

        var defaultSettings = App.Current.defaultShapeSettings();
        if (defaultSettings && !this._element.noDefaultSettings) {
            this._element.setProps(defaultSettings);
        }

        if (this._parameters) {
            this._element.setProps(this._parameters);
        }

        Selection.makeSelection([this._element]);
        Selection.hideFrame();

        return false;
    }
    mouseup(event) {
        if (!this._mousepressed) {
            //for example, a drag from outside causes mouseup without mousedown
            return;
        }
        this._mousepressed = false;

        if (this._element) {
            Selection.showFrame();

            Invalidate.requestInteractionOnly();
            if (this._cursorNotMoved) {
                Environment.controller.selectByClick(event);
                Environment.controller.resetCurrentTool();
                event.handled = true;
                return;
            }

            Environment.controller.raiseInteractionStopped(InteractionType.Resizing, event);

            var pos = this._element.position();

            Environment.view.dropToLayer(pos.x, pos.y, this._element);

            this.changeMode(ElementState.Edit);
            Selection.reselect();

            this._hoverArtboard = null;// need to rebuild snapping data TODO: consider to just add data for a new element
        }
        if (SystemConfiguration.ResetActiveToolToDefault) {
            Environment.controller.resetCurrentTool();
        }
        event.handled = true;
    }
    mousemove(event: IMouseEventData) {
        if (!event.cursor){
            event.cursor = "crosshair";
        }

        this._prepareMousePoint(event);

        var artboard = App.Current.activePage.getArtboardAtPoint(event);
        if (artboard !== this._hoverArtboard) {
            this._hoverArtboard = artboard;
            if (artboard) {
                SnapController.calculateSnappingPoints(artboard);
            }
        }

        if (this._mousepressed) {
            if (this._cursorNotMoved) {
                this._cursorNotMoved = (this._point.y === this._startPoint.y) && (this._point.x === this._startPoint.x);

                if (this._cursorNotMoved) {
                    event.handled = true;
                    return false;
                }

                Environment.controller.raiseInteractionStarted(InteractionType.Resizing, event);
            }

            var endPoint = this._point;

            //if use holds shift, we must fit shape into square
            if (event.shiftKey) {
                var height = Math.abs(this._point.y - this._startPoint.y);
                var width = Math.abs(this._point.x - this._startPoint.x);
                var ratio = Math.min(height, width);
                endPoint = new Point(this._startPoint.x + ratio, this._startPoint.y + ratio);
            }

            this.updateElement(this._element, this._startPoint, endPoint);
            Environment.controller.raiseInteractionProgress(InteractionType.Resizing, event);

            Invalidate.requestInteractionOnly();
            event.handled = true;
            return false;
        }
    }

    updateElement(element, startPoint: Point, endPoint: Point){
        var x = Math.min(startPoint.x, endPoint.x),
            y = Math.min(startPoint.y, endPoint.y),
            w = Math.abs(startPoint.x - endPoint.x),
            h = Math.abs(startPoint.y - endPoint.y);

        element.resetTransform();
        element.applyTranslation(new Point(x, y));
        element.prepareAndSetProps({ br: new Rect(0, 0, w, h) });
    }

    _prepareMousePoint(event: IMouseEventData) {
        this._point.set(event.x, event.y);
        var round = true;
        if (!event.ctrlKey) {
            var snapped = SnapController.applySnappingForPoint(this._point);
            if (snapped.x === this._point.x && snapped.y === this._point.y) {
                round = true;
            }
            else {
                let x = snapped.x;
                let y = snapped.y;
                if (snapped.x === this._point.x) {
                    x = Math.round(x);
                }
                if (snapped.y === this._point.y) {
                    y = Math.round(y);
                }
                this._point.set(x, y);
                round = false;
            }
        }
        if (round) {
            this._point.roundMutable();
        }
    }

    changeMode(mode: ElementState): void{
        if (this._element && typeof this._element.mode === "function") {
            this._element.mode(mode);
        }
    }

    canDraw(): boolean{
        return this._mousepressed && !this._cursorNotMoved;
    }

    layerdraw(context, environment) {
        if (this.canDraw()) {
            context.save();

            this._element.applyViewMatrix(context);

            var br = this._element.boundaryRect();
            this._element.drawSelf(context, br.width, br.height, environment);

            context.restore();
        }
    }

    get element(): UIElement{
        return this._element;
    }
}