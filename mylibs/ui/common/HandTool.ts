import Cursor from "../../framework/Cursor";
import {ViewTool} from "../../framework/Defs";
import Environment from "../../environment";
import Tool from "./Tool";
import {IMouseEventData} from "carbon-core";

var debug = require("../../DebugUtil")("carb:handTool");

var setStartingScroll = function (event) {
    var view = Environment.view;
    this.scrollPoint = { x: event.event.screenX, y: event.event.screenY };
    this.scrollX = view.scrollX();
    this.scrollY = view.scrollY();
};

var setCursor = function (open, event: IMouseEventData) {
    var cursor = open ? "hand_opened" : "hand_closed";
    event.cursor = cursor;
};

export default class HandTool extends Tool {
    [name: string]: any;

    constructor(parameters?) {
        super(ViewTool.Hand);
        this._parameters = parameters;
    }
    pause() {
    }
    resume() {
    }
    attach(app, view, controller, mousePressed) {
        this._app = app;
        this._view = view;
        this._controller = controller;
        this._attach();
        this._mousepressed = mousePressed;

        app.currentTool = ViewTool.Hand;
    }
    detach() {
        this._detach();
        this.scrollPoint = null;
        this.scrollX = null;
        this.scrollY = null;
        this._mousepressed = false;
    }
    mousedown(event: IMouseEventData) {
        this._mousepressed = true;
        setStartingScroll.call(this, event);
        event.handled = true;
        setCursor.call(this, false, event);
        debug("Captured mouse down");
        return false; //do not let resize frame to fire
    }
    mouseup(event: IMouseEventData) {
        event.handled = true;
        this._mousepressed = false;
        setCursor.call(this, true, event);
        this.scrollPoint = null;
        debug("Released on mouse up");
    }
    mousemove(event: IMouseEventData) {
        if (this._mousepressed) {
            if (!this.scrollPoint) { //if tool is used with other tool. should be here
                setStartingScroll.call(this, event);
            }

            var view = this.view();

            var x = event['event'].screenX;
            var y = event['event'].screenY;
            var dx = this.scrollPoint.x - x;
            var dy = this.scrollPoint.y - y;

            this.scrollPoint = { x: x, y: y };
            view.scrollX(view.scrollX() + dx);
            view.scrollY(view.scrollY() + dy);
        }
        setCursor.call(this, !this._mousepressed, event);
        event.handled = true;
    }
}
