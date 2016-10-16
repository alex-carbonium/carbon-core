import EditModeAction from "ui/common/EditModeAction";
import AngleAdjuster from "math/AngleAdjuster";
import RemovePathPointCommand from "commands/path/RemovePathPointCommand";
import InsertPathPointCommand from "commands/path/InsertPathPointCommand";
import AddPathPointCommand from "commands/path/AddPathPointCommand";
import AllCommands from "commands/AllCommands";
import commandManager from "framework/commands/CommandManager";
import UIElement from "framework/UIElement";
import Path from  "ui/common/Path";
import SystemConfiguration from "SystemConfiguration";
import Selection from "framework/SelectionModel";
import Cursor from "framework/Cursor";
import Invalidate from "framework/Invalidate";
import SnapController from "framework/SnapController";

export default klass(EditModeAction, (function () {
    var angleAdjuster = new AngleAdjuster(15);
    var closeCurrentPath = function (pt) {
        commandManager.execute(this._element.constructPropsChangedCommand({closed: true}, {closed: false}));
        this._element.closed(true);
        this._currentPoint = pt;
        this._completedPath = true;
        this._currentPoint = null;
        if (this._element.length() === 1) {
            this._element = null;
        }
    };

    var completePath = function () {
        if (this._element) {
            if (this._element.length() > 1) {
                this._element.adjustBoundaries();
            }
            else {
                commandManager.execute(new RemovePathPointCommand(this._element, this._element.pointAtIndex(0)));
            }
            this._element = null;
        }
        this._currentPoint = null;
        setTimeout(function () {
            if(SystemConfiguration.ResetActiveToolToDefault) {
                App.Current.actionManager.invoke("movePointer");
            }
        }, 0);
    };

    var checkIfElementAvailable = function () {
        if (this._element && this._element.isOrphaned()) {
            this._element = null;
        }
        return this._element != null;
    };


    return {
        _constructor: function (app, type, parameters) {
            this._type = type;
            this._app = app;
            this._parameters = parameters;
            this.points = [];
            this._element = null;
            this._attachMode = "edit";
            this._detachMode = "resize";
        },
        detach: function () {
            completePath.call(this);
            EditModeAction.prototype.detach.apply(this, arguments);
        },
        _attach: function () {
            EditModeAction.prototype._attach.apply(this, arguments);
            Cursor.setGlobalCursor("crosshair");
        },
        _detach: function () {
            EditModeAction.prototype._detach.apply(this, arguments);
            Cursor.removeGlobalCursor();
        },
        mousedown: function (event) {
            this._mousepressed = true;
            var x = event.x
                , y = event.y;
            event.handled = true;
            if (!checkIfElementAvailable.call(this)) {
                var element = Selection.selectedElement();
                if (element instanceof Path) {
                    var cp = element.controlPointForPosition(event);
                    if (cp) {
                        commandManager.execute(new RemovePathPointCommand(element, cp));
                        Invalidate.request();
                        SnapController.calculateSnappingPointsForPath(element);
                        return;
                    }
                    var pointInfo = element.getPointIfClose({x: x, y: y});
                    if (pointInfo) {
                        //commandManager.execute(new InsertPathPointCommand(element, pointInfo));
                        var data = element.getInsertPointData(pointInfo);
                        if (data.length === 1) {
                            var newPoint = element.insertPointAtIndex(data[0], data[0].idx);
                        } else {
                            element.changePointAtIndex(data[0], data[0].idx);
                            element.changePointAtIndex(data[1], data[1].idx);
                            newPoint = element.insertPointAtIndex(data[2], data[2].idx);
                        }

                        this._pointOnPath = null;
                        Invalidate.request();
                        SnapController.calculateSnappingPointsForPath(element);
                        return;
                    }
                }

                Selection.unselectAll();
                var that = this;
                this._element = UIElement.fromType(this._type, this._parameters);
                var defaultSettings = App.Current.defaultShapeSettings();
                if (defaultSettings) {
                    this._element.setProps(defaultSettings);
                }

                this._element.x(x);
                this._element.y(y);
                var id = this._element.id();
                App.Current.activePage.dropToPage(x, y, this._element);
                that._element.mode("edit");
                Selection.makeSelection([that._element]);

                if(!(event.event.ctlKey || event.event.metaKey)) {
                    var pos = SnapController.applySnappingForPoint(event);
                } else {
                    pos = event;
                }
                pos = that._element.parent().global2local(pos);
                that._currentPoint = {x: pos.x - that._element.x(), y: pos.y - that._element.y()};
                commandManager.execute(new AddPathPointCommand(that._element, that._currentPoint));
                SnapController.calculateSnappingPointsForPath(that._element);
                Invalidate.request();

                this._completedPath = false;
                return;
            }

            var pt = this._element.controlPointForPosition(event);
            if (pt != null) {
                if (pt === this._element.pointAtIndex(0)) {
                    closeCurrentPath.call(this, pt);
                } else if (pt === this._element.pointAtIndex(this._element.length() - 1)) {
                    this._completedPath = true;
                    this._currentPoint = null;
                } else {
                    commandManager.execute(new RemovePathPointCommand(this._element, pt));
                    if (this._element.length() === 1) {
                        this._element = null;
                    } else {
                        SnapController.calculateSnappingPointsForPath(this._element);
                    }
                }
            } else {
                if(!(event.event.ctlKey || event.event.metaKey)) {
                    var pos = SnapController.applySnappingForPoint(event);
                } else {
                    pos = event;
                }
                pos = this._element.parent().global2local(pos);
                this._currentPoint = {x: pos.x - this._element.x(), y: pos.y - this._element.y()};
                commandManager.execute(new AddPathPointCommand(this._element, this._currentPoint));
                SnapController.calculateSnappingPointsForPath(this._element);
            }
            Invalidate.request();
        },
        mouseup: function (event) {
            this._mousepressed = false;

            if (checkIfElementAvailable.call(this)) {
                var pos = this._element.parent().global2local(event);
                var x = pos.x - this._element.x()
                    , y = pos.y - this._element.y();
                if (this._completedPath) {
                    completePath.call(this);
                }
            }
            Invalidate.request();
            SnapController.clearActiveSnapLines();
        },
        mousemove: function (event) {
            var x = event.x
                , y = event.y;
            var view = this.view();
            Cursor.setGlobalCursor("crosshair");
            if (checkIfElementAvailable.call(this)) {
                var pos = this._element.parent().global2local(event);

                if(!(event.event.ctrlKey||event.event.metaKey)){
                    pos = SnapController.applySnappingForPoint(pos);
                }

                x = pos.x - this._element.x();
                y = pos.y - this._element.y();

                if (event.event.shiftKey) {
                    var point = angleAdjuster.adjust({x: this._currentPoint.x, y: this._currentPoint.y}, {x: x, y: y});
                    x = point.x;
                    y = point.y;
                }

                if (this._mousepressed) {
                    if (this._currentPoint) { //there is no current point when closing the path and moving the 'closing' point without releasing mouse
                        this._currentPoint.cp2x = x;
                        this._currentPoint.cp2y = y;
                        this._currentPoint.cp1x = this._currentPoint.x * 2 - x;
                        this._currentPoint.cp1y = this._currentPoint.y * 2 - y;
                        this._currentPoint.type = 1;
                        event.handled = true;
                        Invalidate.request();
                    }
                } else {
                    var cp = this._element.controlPointForPosition(event);
                    if (cp) {
                        if (cp === this._element.pointAtIndex(0)) {
                            Cursor.setGlobalCursor("close_path");
                        } else {
                            Cursor.setGlobalCursor("remove_point");
                        }
                    }
                }
            } else {
                var element = Selection.selectedElement();
                if (element instanceof Path) {

                    var cp = element.controlPointForPosition(event);
                    if (cp) {
                        Cursor.setGlobalCursor("remove_point");
                    } else {
                        var pt = this._pointOnPath = element.getPointIfClose({x: x, y: y});
                        var matrix = element.globalViewMatrix();
                        this._view = view;
                        if (pt) {
                            var sx = 1, sy = 1;
                            if (element._sourceRect) {
                                sx = element.width() / element._sourceRect.width;
                                sy = element.height() / element._sourceRect.height;
                            }
                            this._pointOnPath = matrix.transformPoint2(pt.x * sx, pt.y * sy);
                            Cursor.setGlobalCursor("add_point");
                        }

                        Invalidate.request();
                    }
                }
            }
        }
        // ,
        // layerdraw: function (context) {
        //     if (this._pointOnPath && this._view) {
        //         var scale = this._view.scale();
        //         context.circle(this._pointOnPath.x, this._pointOnPath.y, 3 / scale);
        //         context.fillStyle = "red";
        //         context.fill();
        //     }
        // }
    }
})());
