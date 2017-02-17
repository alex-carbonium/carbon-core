import Cursor from "../../framework/Cursor";
import {ViewTool} from "../../framework/Defs";
import Environment from "../../environment";
import Tool from "./Tool";

var debug = require("../../DebugUtil")("carb:handTool");

var setStartingScroll = function (event) {
    var view = Environment.view;
    this.scrollPoint = { x: event.event.screenX, y: event.event.screenY };
    this.scrollX = view.scrollX();
    this.scrollY = view.scrollY();
};

var setCursor = function (open) {
    var cursor = open ? "hand_opened" : "hand_closed";
    Cursor.setGlobalCursor(cursor, true);
};

export default class HandTool extends Tool {
    constructor(type, parameters) {
        super(ViewTool.Hand);
        this._type = type;
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
        setCursor.call(this, true);

        app.currentTool = ViewTool.Hand;
    }
    detach() {        
        this._detach();
        this.scrollPoint = null;
        this.scrollX = null;
        this.scrollY = null;
        this._mousepressed = false;
        Cursor.removeGlobalCursor(true);
    }
    mousedown(event) {
        this._mousepressed = true;
        setStartingScroll.call(this, event);
        event.handled = true;
        Cursor.removeGlobalCursor();
        setCursor.call(this);
        debug("Captured mouse down");
        return false; //do not let resize frame to fire
    }
    mouseup(event) {
        event.handled = true;
        this._mousepressed = false;
        setCursor.call(this, true);
        this.scrollPoint = null;
        debug("Released on mouse up");
    }
    mousemove(event) {
        if (this._mousepressed) {
            if (!this.scrollPoint) { //if tool is used with other tool. should be here
                setStartingScroll.call(this, event);
            }

            var view = this.view();

            var x = event.event.screenX;
            var y = event.event.screenY;
            var dx = this.scrollPoint.x - x;
            var dy = this.scrollPoint.y - y;

            this.scrollPoint = { x: x, y: y };
            view.scrollX(view.scrollX() + dx);
            view.scrollY(view.scrollY() + dy);

            event.handled = true;
        }
        setCursor.call(this, !this._mousepressed);
    }
}
