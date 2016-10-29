import EditModeAction from "ui/common/EditModeAction";
import angleAdjuster from "math/AngleAdjuster";
import commandManager from "framework/commands/CommandManager";
import Line from "framework/Line";
import AllCommands from "commands/AllCommands";
import SystemConfiguration from "SystemConfiguration";
import Selection from "framework/SelectionModel";
import Invalidate from "framework/Invalidate";
import SnapController from "framework/SnapController";


export default klass(EditModeAction, (function () {
    var angleStep = 15;

    function update(x1, y1, x2, y2) {
        var props = {
            x1, x2, y1, y2
        }
        this._element.prepareProps(props);
        this._element.setProps(props);
    }

    function resize(x1, y1, x2, y2) {
        var minx = Math.min(x1, x2);
        var miny = Math.min(y1, y2);
        var width = Math.abs(x1 - x2);
        var height = Math.abs(y1 - y2);

        var props = {
            x1: x1 - minx,
            y1: y1 - miny,
            x2: x2 - minx,
            y2: y2 - miny,
            x: minx,
            y: miny,
            width: width,
            height: height
        };
        this._element.prepareProps(props);
        this._element.setProps(props);
    }

    return {
        _constructor: function (app) {
            this._app = app;
            this._attachMode = "select";
            this._detachMode = "resize";
        },
        detach(){
            EditModeAction.prototype.detach.apply(this, arguments);
            SnapController.clearActiveSnapLines();
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
            event.handled = true;
            this._element = new Line();
            App.Current.activePage.nameProvider.assignNewName(this._element);
            var defaultSettings = App.Current.defaultLineSettings();
            if (defaultSettings) {
                this._element.setProps(defaultSettings);
            }
            this._element.stopTrackingResize();
            update.call(this, this._startPoint.x, this._startPoint.y, this._startPoint.x, this._startPoint.y);
            event.handled = true;
            return false;
        },
        mouseup: function (event) {
            this._mousepressed = false;
            event.handled = true;

            if (this._element) {
                Invalidate.requestUpperOnly();
                resize.call(this, this._element.x1(), this._element.y1(), this._element.x2(), this._element.y2());

                var w = this._element.width()
                    , h = this._element.height();
                if (w === 0 && h === 0) {
                    return;
                }

                this._element.trackResize();

                App.Current.activePage.dropToPage(this._element.x(), this._element.y(), this._element);
                var element = this._element;
                Invalidate.request();
                Selection.makeSelection([element]);
            }
            if (SystemConfiguration.ResetActiveToolToDefault) {
                App.Current.actionManager.invoke("movePointer");
            }
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
                var x = pos.x,
                    y = pos.y;
                if (event.event.shiftKey) {
                    var point = angleAdjuster.adjust(this._startPoint, {x: x, y: y});
                    x = point.x;
                    y = point.y;
                }
                update.call(this, this._startPoint.x, this._startPoint.y, x, y);
                Invalidate.requestUpperOnly();
                event.handled = true;
            }
        },
        layerdraw: function (context, environment) {
            if (this._mousepressed) {
                context.save();
                var e = this._element;
                e.viewMatrix().applyToContext(context);
                e.drawSelf(context, e.width(), e.height(), environment);
                context.restore();
            }
        }
    }
})());
