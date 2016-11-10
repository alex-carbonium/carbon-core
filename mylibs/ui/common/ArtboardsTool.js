import SystemConfiguration from "SystemConfiguration";
import Selection from "framework/SelectionModel";
import Invalidate from "framework/Invalidate";
import SnapController from "framework/SnapController";
import Environment from "environment";
import EditModeAction from "ui/common/EditModeAction";
import Promise from "bluebird";
import Artboard from "framework/Artboard";

var fwk = sketch.framework;
export default class ArtboardsTool extends EditModeAction {
    constructor(app, type, parameters) {
        super(app, type, parameters);
        this._type = type;
        this._app = app;
        this._parameters = parameters;
        this._attachMode = "select";
        this._detachMode = "resize";
    }

    detach() {
        EditModeAction.prototype.detach.apply(this, arguments);
        SnapController.clearActiveSnapLines();
    }

    mousedown(event) {
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
        App.Current.activePage.nameProvider.assignNewName(this._element);
        this._cursorNotMoved = true;

        var defaultSettings = App.Current.defaultShapeSettings();
        if (defaultSettings && !this._element.noDefaultSettings) {
            this._element.setProps(defaultSettings);
        }

        this._element.setProps(this._parameters);

        if (typeof this._element.mode === "function") {
            this._element.mode("edit");
        }
        return false;
    }

    selectByClick(event) {
        var artboard = App.Current.activePage.getArtboardAtPoint(event);

        if (!event.event.shiftKey) {
            if (artboard) {
                Selection.makeSelection([artboard]);
            } else {
                Selection.makeSelection([]);
            }
        } else {
            if (artboard) {
                if (Selection.isElementSelected(artboard)) {
                    Selection.selectionMode('remove');
                } else {
                    Selection.selectionMode('add');
                }

                Selection.makeSelection([artboard]);
                Selection.selectionMode('new');
            }
        }

        var element = Selection.selectedElement();
        if(element) {
            this._startDraggingData = event;
            this._dragging = true;
        }
    }

    mouseup(event) {
        this._mousepressed = false;
        this._startDraggingData = null;
        this._dragging = false;

        if (this._element) {
            Invalidate.requestUpperOnly();
            var w = this._element.width()
                , h = this._element.height();
            if (w === 0 && h === 0) {
                if (this._cursorNotMoved) {
                    this.selectByClick(event);
                    event.handled = true;
                }
                return;
            }

            App.Current.activePage.dropToPage(this._element.x(), this._element.y(), this._element);
            var element = this._element;
            Selection.makeSelection([element]);
            this._hoverArtboard = null;// need to rebuild snapping data TODO: consider to just add data for a new element
        }
        if (SystemConfiguration.ResetActiveToolToDefault) {
            App.Current.actionManager.invoke("movePointer");
        }
        this._ratioResizeInfo = null;
        event.handled = true;
    }

    mousemove(event) {

        if(this._startDraggingData){
            var promise = new Promise((resolve, reject) => {
            });
            Environment.controller.beginDragElement(event, Selection.selectedElement(), promise);
            this._dragging = true;
            this._startDraggingData = null;
        }

        if(this._dragging){
            Environment.controller.onmousemove(event);
            return;
        }

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
            if (this._cursorNotMoved) {
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
    }

    layerdraw(context, environment) {
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
            this._element.prepareProps(props);
            this._element.setProps(props);

            this._element.viewMatrix().applyToContext(context);
            if (this._element.clipSelf()) {
                context.rectPath(0, 0, props.width, props.height);
                context.clip();
            }

            this._element.drawSelf(context, props.width, props.height, environment);

            context.restore();
        }
    }
}

