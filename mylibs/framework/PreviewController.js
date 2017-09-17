import domUtil from "utils/dom";
import {ActionType, ActionEvents} from "framework/Defs";
import TouchHelper from "./TouchHelper";
import Selection from "framework/SelectionModel";
import EventHelper from "framework/EventHelper";

function updateEvent(event) {
    var scale = this.view.scale();
    domUtil.layerX(event, Math.round((domUtil.layerX(event) + this.view.scrollX()) * 100 / scale) / 100);
    domUtil.layerY(event, Math.round((domUtil.layerY(event) + this.view.scrollY()) * 100 / scale) / 100);
}

export default class PreviewController {
    constructor(app, view, previewProxy) {
        this.app = app;
        this.activeStory = app.activeStory();
        this.previewProxy = previewProxy;
        this.view = view;
        this.touchHelper = new TouchHelper(view);
        this.onArtboardChanged = EventHelper.createEvent();
    }

    _invokeAction(action) {
        if (action.props.type === ActionType.GoToPage) {
            this.previewProxy.navigateToPage.raise(action.props.targetArtboardId, action.props.animation);
            return;
        }

        throw "Unknown action";
    }

    _propagateAction(eventType, element) {
        if (!element) {
            return false;
        }

        var action = this.activeStory.children.find(a=>{
            return (a.props.sourceElementId == element.id() && a.props.event == eventType);
        });

        if (action) {
            this._invokeAction(action);
            return true;
        }

        var parent = element.parent();
        if (parent && parent != this.view) {
            return this._propagateAction(eventType, parent);
        }

        return false;
    }

    _propagateScroll(delta, element) {
        if (delta.dx === 0 && delta.dy === 0) {
            return;
        }

        if (!element || element === this.view) {
            this.view.scrollX(this.view.scrollX() + delta.dx);
            this.view.scrollY(this.view.scrollY() + delta.dy);
            return;
        }

        if (typeof element.scrollX === 'function') {
            var oldX = element.scrollX();
            element.scrollX(oldX + delta.dx);
            delta.dx -= (oldX - element.scrollX());

            var oldY = element.scrollY();
            element.scrollY(oldY + delta.dy);
            delta.dY -= (oldY - element.scrollY());
        }

        var parent = element.parent();
        if (parent) {
            this._propagateScroll(delta, parent);
        }
    }

    onpanstart(event) {
        this.touchHelper.onpanstart(event);
    }

    onpanmove(event) {
        this.touchHelper.onpanmove(event);
    }

    onpanend(event) {
        this.touchHelper.onpanend(event);
    }

    ondoubletap() {

    }

    onWindowResize() {

    }

    onpinchmove(event) {
        this.touchHelper.onpinchmove(event);
        this.view.invalidate();
    }

    onpinchstart(event) {
        this.touchHelper.onpinchstart(event);
    }

    onpinchend(event) {
        this.touchHelper.onpinchend(event);
    }


    onscroll(eventData) {
        var element = this.previewProxy.activePage.hitElementDirect(eventData, this.view.scale());
        var delta = {dx: eventData.event.deltaX, dy: eventData.event.deltaY};
        this._propagateScroll(delta, element);
    }

    onmousedown(eventData) {
        var element = this.previewProxy.activePage.hitElementDirect(eventData, this.view.scale());
        this._propagateAction(ActionEvents.mousedown, element);
    }

    onmousemove(eventData) {
        var element = this.previewProxy.activePage.hitElementDirect(eventData, this.view.scale());
        this._propagateAction(ActionEvents.mousemove, element);
    }

    onmouseenter(eventData) {
        var element = this.previewProxy.activePage.hitElementDirect(eventData, this.view.scale());
        this._propagateAction(ActionEvents.mouseenter, element);
    }

    onmouseleave(eventData) {
        var element = this.previewProxy.activePage.hitElementDirect(eventData, this.view.scale());
        this._propagateAction(ActionEvents.mouseleave, element);
    }

    onmouseup(eventData) {
        var element = this.previewProxy.activePage.hitElementDirect(eventData, this.view.scale());
        this._propagateAction(ActionEvents.mouseup, element);
    }

    ondblclick(eventData) {
        var element = this.previewProxy.activePage.hitElementDirect(eventData, this.view.scale());
        this._propagateAction(ActionEvents.dblclick, element);
    }

    onclick(eventData) {
        var element = this.previewProxy.activePage.hitElementDirect(eventData, this.view.scale());
        if(!this._propagateAction(ActionEvents.click, element)){
            this.view.displayClickSpots.raise();
        }
    }


    beginDragElement(event, element, stopDragPromise) {
    }


    captureMouse(/*UIElement*/element) {
        this._captureElement = element;
    }

    releaseMouse() {
        this._captureElement = null;
    }

    showContextMenu(event) {
    }

    cancel() {
    }

    isDragging() {
        return false;
    }

    createEventData(event) {
        updateEvent.call(this, event);
        return {
            handled: false,
            x: domUtil.layerX(event),
            y: domUtil.layerY(event),
            event: event,
            ctrlKey: event.ctrlKey || event.metaKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
            view: this
        }
    }
}