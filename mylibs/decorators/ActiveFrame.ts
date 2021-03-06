import {PointDirection} from "../framework/Defs";
import UIElementDecorator from "../framework/UIElementDecorator";
import PropertyTracker from "../framework/PropertyTracker";
import Cursor from "../framework/Cursor";
import Invalidate from "../framework/Invalidate";
import UserSettings from "../UserSettings";
import { IView, IController } from "carbon-core";

//common code for identifying frame size during resize
//this supports current behavior when selection frame does not move during resize
var SelectionFramePrototype = {
    getWidth: function(){
        if (this.captured && this.originalRect){
            return this.originalRect.width;
        }
        return this.element.width;
    },
    getHeight: function(){
        if (this.captured && this.originalRect){
            return this.originalRect.height;
        }
        return this.element.height;
    }
};


function updatePosition(that) {
    that._frameType.updateFromElement(that._frame, that.view);
    Invalidate.requestInteractionOnly();
};

function parentChanged() {
    updatePosition(this);
};

function propertyChanged(element, newProps, oldProps) {
    if (this._frame && this._frame.captured || this._element.id !== element.id) {
        return;
    }
    //TODO: add support for changing parent
    if (newProps.m !== oldProps.m || newProps.br !== oldProps.br
        || newProps.x1 !== oldProps.x1 || newProps.y1 !== oldProps.y1
        || newProps.x2 !== oldProps.x2 || newProps.y2 !== oldProps.y2) {
        updatePosition(this);
    }
}


function onMouseDown(event) {
    var pointId = this._frameType.hitPointIndex(this._frame, event);

    if (pointId >= 0 && !this._originalPoint) {
        this._originalPoint = this._frame.points[pointId];
        this._originalCursor = Cursor.getCursor();
        this._frameType.capturePoint(this._frame, this._originalPoint, event);
        event.handled = true;
        this._frame.captured = true;
        return false;
    }
}

function onMouseUp(event) {
    if (this._originalPoint) {
        this._frameType.releasePoint(this._frame, this._originalPoint, event);
        this._frame.captured = false;
        updatePosition(this);
        delete this._originalPoint;

        //specific to rotation, but generalized - when releasing mouse, cursor could be over another point, so update it
        onMouseMove.call(this, event);
        this.controller.updateCursor(event);

        event.handled = true;
        return false;
    }
}

function onMouseMove(event) {
    if (this._originalPoint) {
        event.cursor = this._currentCursor;
        this._frameType.movePoint(this._frame, this._originalPoint, event);
        event.handled = true;
        return false;
    }
    else if (!event.handled) {
        var pointIndex = this._frameType.hitPointIndex(this._frame, event);
        if (pointIndex !== -1) {
            var p = this._frame.points[pointIndex];
            var cursorIndex = p.type.rotateCursorPointer(p.cursor, this._frame.element.angle, this._frame.element.isFlipped(true));
            event.cursor = p.type.cursorSet[cursorIndex];
            this._currentCursor = event.cursor;
        }
    }
}

function onClick(event){
    var pointId = this._frameType.hitPointIndex(this._frame, event);
    if (pointId >= 0){
        //do not let designer controller remove selection if clicking on a point, but outside the element
        event.handled = true;
    }
}

export default class ActiveFrame extends UIElementDecorator {

    constructor(private view:IView, private controller:IController) {
        super();
        this.margin = 0;
        this._captured = false;
        this._currentCursor = null;
    }

    attach(element) {
        UIElementDecorator.prototype.attach.call(this, element);

        if(!this.view.interactionLayer){
            return;
        }

        this._element = element;
        this._frameType = element.selectionFrameType();
        this._frame = Object.create(SelectionFramePrototype);
        Object.assign(this._frame, element.createSelectionFrame(this.view));
        this._frameType.updateFromElement(this._frame, this.view);

        this.view.scaleChanged.bind(this, parentChanged);

        this.rect = (this.element as any).getBoundaryRectGlobal();
        this._mouseDownHandler = this.controller.mousedownEvent.bindHighPriority(this, onMouseDown);
        this._mouseUpHandler = this.controller.mouseupEvent.bindHighPriority(this, onMouseUp);
        this._mouseMoveHandler = this.controller.mousemoveEvent.bindHighPriority(this, onMouseMove);
        this._clickHandler = this.controller.clickEvent.bindHighPriority(this, onClick);

        element.enablePropsTracking();
        PropertyTracker.propertyChanged.bind(this, propertyChanged);


        this._layerdrawHandler = this.view.interactionLayer.ondraw.bind(this, this.layerdraw);

        Invalidate.requestInteractionOnly();
    }

    detach() {
        UIElementDecorator.prototype.detach.call(this);
        var view = this.view;

        view.scaleChanged.unbind(this, parentChanged);

        this._element.disablePropsTracking();
        PropertyTracker.propertyChanged.unbind(this, propertyChanged);

        this._layerdrawHandler.dispose();
        Invalidate.requestInteractionOnly();
        this._mouseDownHandler.dispose();
        this._mouseUpHandler.dispose();
        this._mouseMoveHandler.dispose();
        this._clickHandler.dispose();
    }

    layerdraw(context, env) {
        if (this.visible){
            context.save();
            this._frameType.draw(this._frame, context, env, this._originalPoint);
            context.restore();
        }
    }
}


