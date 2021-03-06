import domUtil from "../utils/dom";
import { ActionType, ActionEvents } from "./Defs";
import TouchHelper from "./TouchHelper";
import Selection from "./SelectionModel";
import EventHelper from "./EventHelper";
import Invalidate from "./Invalidate";
import NullContainer from "./NullContainer";
import { IText, IController, IMouseEventData } from "carbon-core";
import { PreviewTextTool } from "./PreviewTextTool";
import ControllerBase from "./ControllerBase";
import Cursor from "./Cursor";
import { IMatrix } from "carbon-geometry";
import { RuntimeProxy } from "../code/runtime/RuntimeProxy";

export default class PreviewController extends ControllerBase {
    [key: string]: any;
    private previewTextTool: PreviewTextTool;

    constructor(app, view, previewModel) {
        super(app, view);
        this.activeStory = app.activeStory();
        this.previewModel = previewModel;
        this.touchHelper = new TouchHelper(view);
        this.previewTextTool = new PreviewTextTool(app, this);
    }

    _invokeAction(action) {
        return this.previewModel.invokeAction(action);
    }

    _eventTypeToName(eventType: ActionEvents) {
        return (eventType).toLowerCase();
    }

    async _propagateAction(eventData, eventType, element, bubble = true): Promise<boolean> {
        if (!element || element === NullContainer) {
            return;
        }

        var events = element.runtimeProps.events;
        let eventName = this._eventTypeToName(eventType);

        if (events && events[eventName]) {
            let res;
            if (eventName === "scroll") {
                res = events[eventName].raise(eventData);
            } else {
                let m: IMatrix = element.globalViewMatrixInverted();
                let pos = m.transformPoint2(eventData.x, eventData.y);
                eventData.layerX = pos.x;
                eventData.layerY = pos.y;
                eventData.target = element.runtimeProxy()//RuntimeProxy.wrap(element);

                res = events[eventName].raise(eventData);
            }

            if (res instanceof Promise) {
                res = await res;
            }

            if (res === false) {
                return true;
            }
        }

        // this is default
        var action = this.activeStory.children.find(a => {
            return ((a.props.sourceElementId === element.id || a.props.sourceElementId === element.props.sourceId) && a.props.event === eventType);
        });

        if (action) {
            this._invokeAction(action);
            return true;
        }

        if (bubble && !eventData.isPropagationStopped()) {
            var parent = element.parent;
            if (parent && parent !== this.view) {
                return await this._propagateAction(eventData, eventType, parent, bubble);
            }
        }

        return;
    }

    async _propagateScroll(delta, element) {
        if (delta.dx === 0 && delta.dy === 0) {
            return;
        }

        if (!element || element === this.view) {
            this.view.scrollX = (this.view.scrollX + delta.dx);
            this.view.scrollY = (this.view.scrollY + delta.dy);
            Invalidate.request();
            return;
        }

        if (element.scrollX !== undefined) {
            var oldX = element.scrollX;
            var oldY = element.scrollY;
            let scroll = { scrollX: Math.round(oldX + delta.dx), scrollY: Math.round(oldY + delta.dy), target: element.runtimeProxy()/*RuntimeProxy.wrap(element)*/ };

            var events = element.runtimeProps.events;
            let eventName = "scroll";

            let res;
            if (events && events[eventName]) {
                res = await events[eventName].raise(scroll);
            }

            if (res !== false) {
                element.scrollX = scroll.scrollX;
                element.scrollY = scroll.scrollY;
                delta.dx -= (element.scrollX - oldX);
                delta.dy -= (element.scrollY - oldY);
                element.invalidate();
                Invalidate.request();
            }
        }

        var parent = element.parent;
        if (parent) {
            this._propagateScroll(delta, parent);
        }
    }

    async onpanstart(eventData) {
        super.onpanstart(eventData);
        if (eventData.handled) {
            return;
        }
        var element = this.previewModel.activePage.hitElementDirect(eventData, this.view);
        let res = await this._propagateAction(eventData, "panstart", element);
        if (res !== false) {
            this._startelement = this.previewModel.activePage.hitElementDirect(eventData, this.view);
        }
    }

    async onpanmove(eventData) {
        super.onpanmove(eventData);
        if (eventData.handled) {
            return;
        }
        var element = this.previewModel.activePage.hitElementDirect(eventData, this.view);
        let res = await this._propagateAction(eventData, "panmove", element);
        if (res !== false) {
            if (this._startelement) {
                if (this._olddelta) {
                    this._propagateScroll(this._olddelta, this._startelement);
                }
                let scale = this.view.scale();
                var delta = { dx: -eventData.event.deltaX / scale, dy: -eventData.event.deltaY / scale };
                this._propagateScroll(delta, this._startelement);
                this._olddelta = { dx: eventData.event.deltaX / scale, dy: eventData.event.deltaY / scale };
            }
        }
    }

    async onpanend(eventData) {
        super.onpanend(eventData);
        if (eventData.handled) {
            return;
        }
        var element = this.previewModel.activePage.hitElementDirect(eventData, this.view);
        let res = await this._propagateAction(eventData, "panend", element);
        if (res !== false) {
            if (this._startelement) {
                this._startelement = null;
                this._olddelta = null;
            }
        }
    }

    onpinchmove(eventData) {
        super.onpinchmove(eventData);
        if (eventData.handled) {
            return;
        }
        var element = this.previewModel.activePage.hitElementDirect(eventData, this.view);
        this._propagateAction(eventData, "pinch", element);
    }

    onpinchstart(eventData) {
        super.onpinchstart(eventData);
        if (eventData.handled) {
            return;
        }
        var element = this.previewModel.activePage.hitElementDirect(eventData, this.view);
        this._propagateAction(eventData, "pinchstart", element);
    }

    onpinchend(eventData) {
        super.onpinchend(eventData);
        if (eventData.handled) {
            return;
        }
        var element = this.previewModel.activePage.hitElementDirect(eventData, this.view);
        this._propagateAction(eventData, "pinchend", element);
    }

    ontap(eventData) {
        super.ontap(eventData);
        if (eventData.handled) {
            return;
        }
        var element = this.previewModel.activePage.hitElementDirect(eventData, this.view);
        this._propagateAction(eventData, "tap", element);
    }

    ondoubletap(eventData) {
        super.ondoubletap(eventData);
        if (eventData.handled) {
            return;
        }
        var element = this.previewModel.activePage.hitElementDirect(eventData, this.view);
        this._propagateAction(eventData, "doubletap", element);
    }

    onmousewheel(eventData) {
        super.onmousewheel(eventData);
        if (eventData.handled) {
            return;
        }
        var element = this.previewModel.activePage.hitElementDirect(eventData, this.view);
        this._propagateAction(eventData, "mousewheel", element);

        if (eventData.ctrlKey || eventData.metaKey) {
            // to avoid zoom by wheel in preview
            eventData.preventDefault();
        }
    }


    async onscroll(eventData) {
        var element = this.previewModel.activePage.hitElementDirect(eventData, this.view);
        let res = await this._propagateAction(eventData, "scroll", element);
        if (res !== false) {
            var delta = { dx: eventData.event.deltaX, dy: eventData.event.deltaY };
            this._propagateScroll(delta, element);
        }
    }

    onmousedown(eventData) {
        super.onmousedown(eventData);
        var element = this.previewModel.activePage.hitElementDirect(eventData, this.view);
        this._propagateAction(eventData, "mousedown", element);
    }
    _mouseOverElements = [];
    onmousemove(eventData) {
        super.onmousemove(eventData);

        var element = this.previewModel.activePage.hitElementDirect(eventData, this.view);
        var alreadyFound = false;
        for (var i = this._mouseOverElements.length - 1; i >= 0; --i) {
            var e = this._mouseOverElements[i];
            if (e.isDisposed()) {
                this._mouseOverElements.splice(i, 1);
            } else if (e === element) {
                alreadyFound = true;
            } else if (!e.hitTest(eventData, eventData.view)) {
                this._propagateAction(eventData, "mouseleave", e, false);
                this._mouseOverElements.splice(i, 1);
            }
        }
        if (element) {
            if (!alreadyFound) {
                this._mouseOverElements.push(element);
                this._propagateAction(eventData, "mouseenter", element);
            }
            this._propagateAction(eventData, "mousemove", element);
        }
    }

    onmouseenter(eventData) {
        // super.onmouseenter(eventData);
        // var element = this.previewModel.activePage.hitElementDirect(eventData, this.view);
        // this._propagateAction(eventData, "mouseenter", element);
    }

    onmouseleave(eventData) {
        // super.onmouseleave(eventData);
        // var element = this.previewModel.activePage.hitElementDirect(eventData, this.view);
        // this._propagateAction(eventData, "mouseleave", element);
    }

    onmouseup(eventData) {
        super.onmouseup(eventData);
        var element = this.previewModel.activePage.hitElementDirect(eventData, this.view);
        this._propagateAction(eventData, "mouseup", element);
    }

    ondblclick(eventData) {
        super.ondblclick(eventData);
        var element = this.previewModel.activePage.hitElementDirect(eventData, this.view);
        this._propagateAction(eventData, "dblclick", element);
    }

    async onclick(eventData) {
        super.onclick(eventData);
        var element = this.previewModel.activePage.hitElementDirect(eventData, this.view);
        if (! await this._propagateAction(eventData, "click", element)) {
            (this.view as any).displayClickSpots.raise();
        }
    }

    onblur() {
        if (this.isInlineEditMode) {
            this.inlineEditor.deactivate(true);
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

    updateCursor(eventData: IMouseEventData) {
        if (eventData && eventData.cursor) {
            if (eventData.cursor) {
                Cursor.setCursor(eventData.cursor);
                return;
            }
        }
        else if (!Cursor.hasGlobalCursor()) {
            Cursor.setCursor(this.defaultCursor());
        }
    }
}