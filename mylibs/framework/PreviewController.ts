import domUtil from "utils/dom";
import { ActionType, ActionEvents } from "framework/Defs";
import TouchHelper from "./TouchHelper";
import Selection from "framework/SelectionModel";
import EventHelper from "framework/EventHelper";
import Invalidate from "framework/Invalidate";
import NullContainer from "framework/NullContainer";

function updateEvent(event) {
    var scale = this.view.scale();
    domUtil.layerX(event, Math.round((domUtil.layerX(event) + this.view.scrollX()) * 100 / scale) / 100);
    domUtil.layerY(event, Math.round((domUtil.layerY(event) + this.view.scrollY()) * 100 / scale) / 100);
}

export default class PreviewController {
    [key: string]: any;

    constructor(app, view, previewModel) {
        this.app = app;
        this.activeStory = app.activeStory();
        this.previewModel = previewModel;
        this.view = view;
        this.touchHelper = new TouchHelper(view);
        this.onArtboardChanged = EventHelper.createEvent();
    }

    _invokeAction(action) {
        return this.previewModel.invokeAction(action);
    }

    _eventTypeToName(eventType: ActionEvents) {
        switch (eventType) {
            case ActionEvents.click:
                return "onclick";
            case ActionEvents.mousemove:
                return "onmousemove";
            case ActionEvents.mousedown:
                return "onmousedown";
            case ActionEvents.mouseup:
                return "onmouseup";
            case ActionEvents.mouseenter:
                return "onmouseenter";
            case ActionEvents.mouseleave:
                return "onmouseleave";
            case ActionEvents.dblclick:
                return "ondblclik";
        }

        assertNever(eventType);
    }

    async _propagateAction(eventType, element):Promise<boolean> {
        if (!element || element === NullContainer) {
            return false;
        }

        var events = element.runtimeProps.events;
        let eventName = this._eventTypeToName(eventType);

        if (events && events[eventName]) {
            let res = events[eventName]();
            if(res instanceof Promise) {
                res = await res;
            }

            if (res === false) {
                return true;
            }
        }
        // this is default
        var action = this.activeStory.children.find(a => {
            return (a.props.sourceElementId === element.id && a.props.event === eventType);
        });

        if (action) {
            this._invokeAction(action);
            return true;
        }

        var parent = element.parent;
        if (parent && parent !== this.view) {
            return await this._propagateAction(eventType, parent);
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
            Invalidate.request();
            return;
        }

        if (typeof element.scrollX === 'function') {
            var oldX = element.scrollX();
            element.scrollX(oldX + delta.dx);
            delta.dx -= (oldX - element.scrollX());

            var oldY = element.scrollY();
            element.scrollY(oldY + delta.dy);
            delta.dy -= (oldY - element.scrollY());
            element.invalidate();
            Invalidate.request();
        }

        var parent = element.parent;
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

    resetCurrentTool() {

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
        var element = this.previewModel.activePage.hitElementDirect(eventData, this.view.scale());
        var delta = { dx: eventData.event.deltaX, dy: eventData.event.deltaY };
        this._propagateScroll(delta, element);
    }

    onmousedown(eventData) {
        var element = this.previewModel.activePage.hitElementDirect(eventData, this.view.scale());
        this._propagateAction(ActionEvents.mousedown, element);
    }

    onmousemove(eventData) {
        var element = this.previewModel.activePage.hitElementDirect(eventData, this.view.scale());
        this._propagateAction(ActionEvents.mousemove, element);
    }

    onmouseenter(eventData) {
        var element = this.previewModel.activePage.hitElementDirect(eventData, this.view.scale());
        this._propagateAction(ActionEvents.mouseenter, element);
    }

    onmouseleave(eventData) {
        var element = this.previewModel.activePage.hitElementDirect(eventData, this.view.scale());
        this._propagateAction(ActionEvents.mouseleave, element);
    }

    onmouseup(eventData) {
        var element = this.previewModel.activePage.hitElementDirect(eventData, this.view.scale());
        this._propagateAction(ActionEvents.mouseup, element);
    }

    ondblclick(eventData) {
        var element = this.previewModel.activePage.hitElementDirect(eventData, this.view.scale());
        this._propagateAction(ActionEvents.dblclick, element);
    }

    async onclick(eventData) {
        var element = this.previewModel.activePage.hitElementDirect(eventData, this.view.scale());
        if (! await this._propagateAction(ActionEvents.click, element)) {
            this.view.displayClickSpots.raise();
        }
    }


    beginDragElements(event, elements, stopDragPromise) {
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