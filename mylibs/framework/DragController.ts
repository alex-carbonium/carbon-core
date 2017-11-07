import { keyboard } from "../platform/Keyboard";
import { IMouseEventData } from "carbon-core";
import Environment from "../environment";

var debug = require("DebugUtil")("carb:dragController");

export default class DragController {
    [name: string]: any;
    _lastMouseMove: IMouseEventData;

    constructor() {
        this.onSearching = nop;
        this.onSearchCancelled = nop;
        this.onStarting = nop;
        this.onDragging = nop;
        this.onStopped = nop;
        this.onClicked = nop;

        this.isDragging = false;

        this._dragRequested = false;
        this._startDragPoint = null;
        this._lastDragPoint = null;
        this._lastMouseMove = null;
        this._tokens = [];
    }
    mouseDown(e) {
        if (e.handled) {
            this.onSearchCancelled(e);
            return;
        }
        if (this.onStarting(e) !== false) {
            this._startDragPoint = { x: e.x, y: e.y };
            this._dragRequested = true;
            e.handled = true;
        }
        return !e.handled;
    }
    mouseMove(e: IMouseEventData) {
        //e.handled is not checked on purpose, case: path tool handles events, but ruler guide can overrule
        if (Environment.controller.isDragging()) {
            return;
        }

        this._lastMouseMove = {
            handled: e.handled,
            x: e.x,
            y: e.y,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            shiftKey: e.shiftKey
        };

        if (this.isDragging) {
            this.dragging(e);
            e.handled = true;
            return;
        }

        if (this._dragRequested && (e.x !== this._startDragPoint.x || e.y !== this._startDragPoint.y)) {
            this.isDragging = true;
            this.dragging(e);
            e.handled = true;
        }
        else {
            this.onSearching(e);
        }
    }
    dragging(e) {
        if (this._lastDragPoint === null) {
            this._lastDragPoint = this._startDragPoint;
        }
        var dx = e.x - this._startDragPoint.x;
        var dy = e.y - this._startDragPoint.y;
        var ddx = e.x - this._lastDragPoint.x;
        var ddy = e.y - this._lastDragPoint.y;

        debug("dragging dx=%d dy=%d ddx=%d ddy=%d", dx, dy, ddx, ddy);
        this.onDragging(e, dx, dy, ddx, ddy);

        this._lastDragPoint = { x: e.x, y: e.y };
    }
    mouseUp(e) {
        if (!this.isDragging && e.handled) {
            return;
        }

        if (this.isDragging) {
            if (e.x !== this._lastDragPoint.x || e.y !== this._lastDragPoint.y) {
                this.dragging(e);
            }

            this._dragRequested = false;
            this._startDragPoint = null;
            this._lastDragPoint = null;
            this.isDragging = false;

            this.onStopped(e);

            e.handled = true;
        }
        else {
            //scenario: clicking on ruler should not activate another artboard under ruler
            e.handled = this._dragRequested;
        }
    }
    click(e) {
        if (e.handled) {
            return;
        }
        this._startDragPoint = null;
        this._lastDragPoint = null;
        this._dragRequested = false;
        this.isDragging = false;

        this.onClicked(e);
    }
    bindToController(controller, highPriority: boolean = false) {
        if (highPriority) {
            let t = controller.mousedownEvent.bindHighPriority(this, this.mouseDown);
            this._tokens.push(t);

            t = controller.mousemoveEvent.bindHighPriority(this, this.mouseMove);
            this._tokens.push(t);

            t = controller.mouseupEvent.bindHighPriority(this, this.mouseUp);
            this._tokens.push(t);

            t = controller.clickEvent.bindHighPriority(this, this.click);
            this._tokens.push(t);
        }
        else {
            let t = controller.mousedownEvent.bind(this, this.mouseDown);
            this._tokens.push(t);

            t = controller.mousemoveEvent.bind(this, this.mouseMove);
            this._tokens.push(t);

            t = controller.mouseupEvent.bind(this, this.mouseUp);
            this._tokens.push(t);

            t = controller.clickEvent.bind(this, this.click);
            this._tokens.push(t);
        }

        let t = keyboard.changed.bind(() => {
            if (this._lastMouseMove) {
                this.mouseMove(this._lastMouseMove);
            }
        });
        this._tokens.push(t);
    }
    unbind() {
        for (let i = 0, l = this._tokens.length; i < l; ++i) {
            let token = this._tokens[i];
            token.dispose();
        }
        this._tokens = [];

        this.isDragging = false;

        this._dragRequested = false;
        this._startDragPoint = null;
        this._lastDragPoint = null;
    }
}

function nop() {
}