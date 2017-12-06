import domUtil from "utils/dom";
import { ActionType, ActionEvents } from "framework/Defs";
import TouchHelper from "./TouchHelper";
import Selection from "framework/SelectionModel";
import EventHelper from "framework/EventHelper";
import Invalidate from "framework/Invalidate";
import NullContainer from "framework/NullContainer";
import { IText, IController, IMouseEventData } from "carbon-core";
import { PreviewTextTool } from "./PreviewTextTool";
import ControllerBase from "./ControllerBase";
import Cursor from "./Cursor";
import { IMatrix } from "carbon-geometry";

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

    async _propagateAction(eventData, eventType, element): Promise<boolean> {
        if (!element || element === NullContainer) {
            return false;
        }

        var events = element.runtimeProps.events;
        let eventName = this._eventTypeToName(eventType);

        if (events && events[eventName]) {
            let m: IMatrix = element.globalViewMatrixInverted();
            let pos = m.transformPoint2(eventData.x, eventData.y);
            let event = {
                x: eventData.x,
                y: eventData.y,
                layerX: pos.x,
                layerY: pos.y,
                altKey: eventData.altKey,
                shiftKey: eventData.shiftKey,
                ctrlKey: eventData.ctrlKey,
                metaKey: eventData.metaKey
            }

            let res = events[eventName].raise(event);
            if (res instanceof Promise) {
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
            return await this._propagateAction(eventData, eventType, parent);
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

    // onpinchmove(event) {
    //     super.onpinchmove(event);
    //     this.view.invalidate();
    // }

    onpanstart(eventData) {
        this._startelement = this.previewModel.activePage.hitElementDirect(eventData, this.view.scale());
    }

    onpanmove(eventData) {
        if (this._startelement) {
            if (this._olddelta) {
                this._propagateScroll(this._olddelta, this._startelement);
            }
            let scale = this.view.scale();
            var delta = { dx: -eventData.event.deltaX/scale, dy: -eventData.event.deltaY/scale};
            this._propagateScroll(delta, this._startelement);
            this._olddelta = { dx: eventData.event.deltaX/scale, dy: eventData.event.deltaY/scale };
        }
    }

    onpanend(event) {
        if (this._startelement) {
            this._startelement = null;
            this._olddelta = null;
        }
    }

    onpinchmove(event) {
    }

    onpinchstart(event) {
    }

    onpinchend(event) {
    }


    onscroll(eventData) {
        var element = this.previewModel.activePage.hitElementDirect(eventData, this.view.scale());
        var delta = { dx: eventData.event.deltaX, dy: eventData.event.deltaY };
        this._propagateScroll(delta, element);
    }

    onmousedown(eventData) {
        super.onmousedown(eventData);
        var element = this.previewModel.activePage.hitElementDirect(eventData, this.view.scale());
        this._propagateAction(eventData, ActionEvents.mousedown, element);
    }

    onmousemove(eventData) {
        super.onmousemove(eventData);

        var element = this.previewModel.activePage.hitElementDirect(eventData, this.view.scale());
        this._propagateAction(eventData, ActionEvents.mousemove, element);
    }

    onmouseenter(eventData) {
        super.onmouseenter(eventData);
        var element = this.previewModel.activePage.hitElementDirect(eventData, this.view.scale());
        this._propagateAction(eventData, ActionEvents.mouseenter, element);
    }

    onmouseleave(eventData) {
        super.onmouseleave(eventData);
        var element = this.previewModel.activePage.hitElementDirect(eventData, this.view.scale());
        this._propagateAction(eventData, ActionEvents.mouseleave, element);
    }

    onmouseup(eventData) {
        super.onmouseup(eventData);
        var element = this.previewModel.activePage.hitElementDirect(eventData, this.view.scale());
        this._propagateAction(eventData, ActionEvents.mouseup, element);
    }

    ondblclick(eventData) {
        super.ondblclick(eventData);
        var element = this.previewModel.activePage.hitElementDirect(eventData, this.view.scale());
        this._propagateAction(eventData, ActionEvents.dblclick, element);
    }

    async onclick(eventData) {
        super.onclick(eventData);
        var element = this.previewModel.activePage.hitElementDirect(eventData, this.view.scale());
        if (! await this._propagateAction(eventData, ActionEvents.click, element)) {
            (this.view as any).displayClickSpots.raise();
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