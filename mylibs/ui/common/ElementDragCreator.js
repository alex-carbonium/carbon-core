import SystemConfiguration from "SystemConfiguration";
import Selection from "framework/SelectionModel";
import Invalidate from "framework/Invalidate";
import SnapController from "framework/SnapController";
import Environment from "environment";
import Cursor from "../../framework/Cursor";
import Rect from "../../math/rect";
import Point from "../../math/point";

define(["ui/common/EditModeAction", "math/matrix"], function (EditModeAction, Matrix) {
    var fwk = sketch.framework;
    return klass2("sketch.ui.common.ElementDragCreator", EditModeAction, (function () {
        return {
            _constructor: function (app, type, parameters) {
                this._type = type;
                this._app = app;
                this._parameters = parameters;
                this._attachMode = "select";
                this._detachMode = "resize";
            },
            attach: function(){
                EditModeAction.prototype.attach.apply(this, arguments);
                Cursor.setGlobalCursor("crosshair", true);
            },
            detach(){
                EditModeAction.prototype.detach.apply(this, arguments);
                SnapController.clearActiveSnapLines();
                Cursor.removeGlobalCursor(true);
            },
            mousedown: function (event) {
                this._mousepressed = true;
                if (event.event.ctrlKey || event.event.metaKey) {
                    var pos = event;
                }
                else {
                    pos = SnapController.applySnappingForPoint(event);
                }
                this._startPoint = {x: pos.x, y: pos.y};
                this._nextPoint = {x: pos.x, y: pos.y};
                event.handled = true;
                this._element = fwk.UIElement.fromType(this._type);
                this._element.beforeAddFromToolbox();
                App.Current.activePage.nameProvider.assignNewName(this._element);
                this._cursorNotMoved = true;

                var defaultSettings = App.Current.defaultShapeSettings();
                if (defaultSettings && !this._element.noDefaultSettings) {
                    this._element.setProps(defaultSettings);
                }

                if (this._parameters){
                    this._element.setProps(this._parameters);
                }

                if (typeof this._element.mode === "function") {
                    this._element.mode("edit");
                }
                return false;
            },
            mouseup: function (event) {
                if (!this._mousepressed){
                    //for example, a drag from outside causes mouseup without mousedown
                    return;
                }
                this._mousepressed = false;

                var view = this.view();

                if (this._element) {
                    Invalidate.requestUpperOnly();
                    var w = this._element.width()
                        , h = this._element.height();
                    if (w === 0 && h === 0) {
                        if (this._cursorNotMoved) {
                            Environment.controller.selectByClick(event);
                            App.Current.actionManager.invoke("movePointer");
                            event.handled = true;
                        }
                        return;
                    }

                    App.Current.activePage.dropToPage(this._element.x(), this._element.y(), this._element);
                    this._element.afterAddFromToolbox();
                    var element = this._element;
                    Selection.makeSelection([element]);
                    this._hoverArtboard = null;// need to rebuild snapping data TODO: consider to just add data for a new element
                }
                if (SystemConfiguration.ResetActiveToolToDefault) {
                    App.Current.actionManager.invoke("movePointer");
                }
                this._ratioResizeInfo = null;
                event.handled = true;
            },
            mousemove: function (event) {
                var artboard = App.Current.activePage.getArtboardAtPoint(event);
                if (artboard != this._hoverArtboard) {
                    this._hoverArtboard = artboard;
                    if (artboard) {
                        SnapController.calculateSnappingPoints(artboard);
                    }
                }

                if (event.event.ctrlKey || event.event.metaKey) {
                    var pos = event;
                }
                else {
                    pos = SnapController.applySnappingForPoint(event);
                }

                if (this._mousepressed) {
                    if(this._cursorNotMoved) {
                        this._cursorNotMoved = (pos.y === this._startPoint.y) && (pos.x === this._startPoint.x);
                    }
                    //if use holds shift, we must fit shape into square
                    if (event.event.shiftKey) {
                        var height = Math.abs(pos.y - this._startPoint.y);
                        var width = Math.abs(pos.x - this._startPoint.x);
                        var ration = Math.min(height, width);

                        var x = this._startPoint.x + ration;
                        var y = this._startPoint.y + ration;

                        this._nextPoint = {x: x, y: y};
                    } else {
                        this._nextPoint = {x: pos.x, y: pos.y};
                    }

                    Invalidate.requestUpperOnly();
                    event.handled = true;
                    return false;
                }
            },
            layerdraw: function (context, environment) {
                if (this._mousepressed) {
                    var x1 = this._startPoint.x
                        , y1 = this._startPoint.y
                        , x2 = this._nextPoint.x
                        , y2 = this._nextPoint.y
                        , x = Math.min(x1, x2)
                        , y = Math.min(y1, y2)
                        , w = Math.abs(x1 - x2)
                        , h = Math.abs(y1 - y2);

                    context.save();

                    var props = {x: x, y: y, width: w, height: h};
                    this._element.resetTransform();
                    this._element.applyTranslation(new Point(x, y), true);
                    this._element.prepareAndSetProps({br: new Rect(0, 0, w, h)});

                    this._element.applyViewMatrix(context);
                    // if (this._element.clipSelf()) {
                    //     context.rectPath(0, 0, props.width, props.height);
                    //     context.clip();
                    // }

                    this._element.drawSelf(context, props.width, props.height, environment);

                    context.restore();
                }
            }
        }
    })());
});