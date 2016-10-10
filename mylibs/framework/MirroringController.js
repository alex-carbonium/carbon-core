import EventHelper from "framework/EventHelper";
import domUtil from "utils/dom";
import TouchHelper from "./TouchHelper";

function updateEvent(event) {
    var scale = this.view.scale();
    domUtil.layerX(event, Math.round((domUtil.layerX(event) + this.view.scrollX()) * 100 / scale) / 100);
    domUtil.layerY(event, Math.round((domUtil.layerY(event) + this.view.scrollY()) * 100 / scale) / 100);
    event._ctrlKey = event.ctrlKey || event.metaKey;
    event._scale = scale;
}

export default class MirroringController {
    constructor(app, view) {
        this.app = app;
        this.view = view;
        this.onArtboardChanged = EventHelper.createEvent();
        this.touchHelper = new TouchHelper(view);
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
        var element = this.view.page.hitElement(eventData, this.view.scale());
        var delta = {dx: eventData.event.deltaX, dy: eventData.event.deltaY};
        this._propagateScroll(delta, element);
    }

    onmousedown(eventData) {
    }

    onmousemove(eventData) {
    }

    onmouseenter(eventData) {
    }

    onmouseleave(eventData) {
    }

    onmouseup(eventData) {
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


    ondblclick(eventData) {
        if(this.view.scale() === 1)
        {
            this.view.page.fitToViewport();
        } else {
            this.view.scale(1);
        }
        this.view.page._version = null;
        this.view.invalidate();
    }

    onclick(eventData) {
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

    createEventData(event) {
        updateEvent.call(this, event);
        return {
            handled: false,
            x: domUtil.layerX(event),
            y: domUtil.layerY(event),
            event: event,
            ctrlKey: event._ctrlKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
            view: this
        }
    }
}