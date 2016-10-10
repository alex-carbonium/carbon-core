import Cursor from "framework/Cursor";
import Environment from "environment";

define(["ui/common/EditModeAction"], function(EditModeAction){
    var fwk = sketch.framework;
    var debug = require("DebugUtil")("carb:handTool");

    return klass(EditModeAction, (function(){

        var setStartingScroll = function (event) {
            var view = Environment.view;
            this.scrollPoint = {x:event.event.screenX, y:event.event.screenY};
            this.scrollX = view.scrollX();
            this.scrollY = view.scrollY();
        };

        var setCursor = function (open) {
            var cursor = open ? "openhand" : "closedhand";
            Cursor.setGlobalCursor(cursor, true);
        };

        return {
            _constructor:function (app, type, parameters) {
                this._type = type;
                this._app = app;
                this._parameters = parameters;
            },
            pause: function(){
            },
            resume: function(){
            },
            attach:function (app, view, controller, mousePressed) {
                this._app = app;
                this._view = view;
                this._controller = controller;
                this._attach();
                this._mousepressed = mousePressed;
                setCursor.call(this, true);
            },
            detach:function () {
                this._detach();
                this.scrollPoint = null;
                this.scrollX = null;
                this.scrollY = null;
                this._mousepressed = false;
                Cursor.removeGlobalCursor(true);
            },
            mousedown:function (event) {
                this._mousepressed = true;
                setStartingScroll.call(this, event);
                event.handled = true;
                Cursor.removeGlobalCursor();
                setCursor.call(this);
                debug("Captured mouse down");
            },
            mouseup:function (event) {
                event.handled = true;
                this._mousepressed = false;
                setCursor.call(this, true);
                this.scrollPoint = null;
                debug("Released on mouse up");
            },
            mousemove:function (event) {
                if (this._mousepressed) {
                    if (!this.scrollPoint) { //if tool is used with other tool. should be here
                        setStartingScroll.call(this, event);
                    }

                    var view = this.view();

                    var x = event.event.screenX;
                    var y = event.event.screenY;
                    var dx = this.scrollPoint.x - x;
                    var dy = this.scrollPoint.y - y;

                    this.scrollPoint = {x:x, y:y};
                    view.scrollX(view.scrollX() + dx);
                    view.scrollY(view.scrollY() + dy);

                    event.handled = true;
                }
                setCursor.call(this, !this._mousepressed);
            }
        }
    })());
});