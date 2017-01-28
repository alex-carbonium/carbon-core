import SystemConfiguration from "SystemConfiguration";
import Selection from "framework/SelectionModel";
import Invalidate from "framework/Invalidate";
import SnapController from "framework/SnapController";
import Environment from "environment";
import Cursor from "../../framework/Cursor";
import Brush from "framework/Brush";
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
                this._point = new Point(0, 0);
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
                var eventData = {handled: false, x: event.x, y: event.y};
                Environment.controller.startDrawingEvent.raise(eventData);
                if (eventData.handled){
                    return true;
                }

                this._mousepressed = true;
                this._prepareMousePoint(event);

                this._startPoint = {x: this._point.x, y: this._point.y};
                this._nextPoint = {x: this._point.x, y: this._point.y};
                event.handled = true;
                this._element = fwk.UIElement.fromType(this._type);
                this._element.beforeAddFromToolbox();
                App.Current.activePage.nameProvider.assignNewName(this._element);
                this._cursorNotMoved = true;

                var defaultSettings = App.Current.defaultShapeSettings();
                if (defaultSettings && !this._element.noDefaultSettings) {
                    var settings = Object.assign({}, defaultSettings, {
                        fill:Brush.extend(defaultSettings.fill, App.Current.defaultFill()),
                        stroke:Brush.extend(defaultSettings.stroke, App.Current.defaultStroke())
                    });
                    this._element.setProps(settings);
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

                    var pos = this._element.position();

                    App.Current.activePage.dropToPage(pos.x, pos.y, this._element);
                    this._element.afterAddFromToolbox();
                    var element = this._element;
                    Selection.makeSelection([element]);
                    this._hoverArtboard = null;// need to rebuild snapping data TODO: consider to just add data for a new element
                }
                if (SystemConfiguration.ResetActiveToolToDefault) {
                    App.Current.actionManager.invoke("movePointer");
                }
                event.handled = true;
            },
            mousemove: function (event) {
                this._prepareMousePoint(event);

                var artboard = App.Current.activePage.getArtboardAtPoint(event);
                if (artboard != this._hoverArtboard) {
                    this._hoverArtboard = artboard;
                    if (artboard) {
                        SnapController.calculateSnappingPoints(artboard);
                    }
                }

                if (this._mousepressed) {
                    if(this._cursorNotMoved) {
                        this._cursorNotMoved = (this._point.y === this._startPoint.y) && (this._point.x === this._startPoint.x);
                    }
                    //if use holds shift, we must fit shape into square
                    if (event.event.shiftKey) {
                        var height = Math.abs(this._point.y - this._startPoint.y);
                        var width = Math.abs(this._point.x - this._startPoint.x);
                        var ration = Math.min(height, width);

                        var x = this._startPoint.x + ration;
                        var y = this._startPoint.y + ration;

                        this._nextPoint = {x: x, y: y};
                    } else {
                        this._nextPoint = {x: this._point.x, y: this._point.y};
                    }

                    Invalidate.requestUpperOnly();
                    event.handled = true;
                    return false;
                }
            },
            _prepareMousePoint: function(event){
                this._point.set(event.x, event.y);
                var round = true;
                if (!(event.event.ctrlKey || event.event.metaKey)) {
                    var snapped = SnapController.applySnappingForPoint(this._point);
                    if (snapped === this._point){
                        round = true;
                    }
                    else{
                        this._point.set(snapped.x, snapped.y);
                        round = false;
                    }
                }
                if (round){
                    this._point.roundMutable();
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

                    this._element.resetTransform();
                    this._element.applyTranslation(new Point(x, y), true);
                    this._element.prepareAndSetProps({br: new Rect(0, 0, w, h)});

                    this._element.applyViewMatrix(context);
                    // if (this._element.clipSelf()) {
                    //     context.rectPath(0, 0, props.width, props.height);
                    //     context.clip();
                    // }

                    this._element.drawSelf(context, w, h, environment);

                    context.restore();
                }
            }
        }
    })());
});