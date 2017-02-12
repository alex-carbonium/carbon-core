import SystemConfiguration from "../../SystemConfiguration";
import Selection from "../../framework/SelectionModel";
import Invalidate from "../../framework/Invalidate";
import SnapController from "../../framework/SnapController";
import Environment from "../../environment";
import Tool from "./Tool";
import Promise from "bluebird";
import Artboard from "../../framework/Artboard";
import ObjectFactory from "../../framework/ObjectFactory";
import {ViewTool} from "../../framework/Defs";
import Rect from "../../math/rect";
import Point from "../../math/point";

export default class ArtboardsTool extends Tool {
    constructor(type, parameters) {
        super(ViewTool.Artboard);
        this._type = type;        
        this._parameters = parameters;
        this._attachMode = "select";
        this._detachMode = "resize";        
    }

    attach(app, view, controller) {
        super.attach(app, view, controller);
        SnapController.calculateSnappingPoints(app.activePage);
    }

    detach() {
        super.detach.apply(this, arguments);
        SnapController.clearActiveSnapLines();
    }

    mousedown(event) {

        this._cursorNotMoved = true;

        var artboard = App.Current.activePage.getArtboardAtPoint(event);
        if (artboard) {
            if (Selection.isElementSelected(artboard)) {
                var element = Selection.selectedElement();
            } else {
                element = artboard;
            }
            if (element) {
                this._startDraggingData = event;
                this._startDraggingData.element = element;
            }
            event.handled = true;
            return;
        }


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
        this._element = ObjectFactory.fromType(this._type);
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
    }

    click(event){
        event.handled = true;
    }

    mouseup(event) {
        this._mousepressed = false;
        this._startDraggingData = null;
        if (this._dragging) {
            this._dragging = false;
            var artboard = App.Current.activePage.getArtboardAtPoint(event);
            if(artboard && !Selection.isElementSelected(artboard)) {
                Selection.makeSelection([artboard]);
            }

            return;
        }

        if (this._element) {
            var element = this._element;
            this._element = null;
            Invalidate.requestUpperOnly();
            var w = element.width()
                , h = element.height();
            if (w === 0 && h === 0) {
                if (this._cursorNotMoved) {
                    this.selectByClick(event);
                    event.handled = true;
                }
                return;
            }

            var pos = element.position();
            App.Current.activePage.dropToPage(pos.x, pos.y, element);
            Selection.makeSelection([element]);
            SnapController.calculateSnappingPoints(App.Current.activePage);
        } else {
            if (this._cursorNotMoved) {
                this.selectByClick(event);
                event.handled = true;
            }
            return;

        }
        if (SystemConfiguration.ResetActiveToolToDefault) {
            App.Current.resetCurrentTool();
        }
        this._ratioResizeInfo = null;
        event.handled = true;
    }

    mousemove(event) {

        if (this._startDraggingData) {
            Environment.controller.beginDrag(this._startDraggingData);
            this._dragging = true;
            this._startDraggingData = null;
        }

        if (this._dragging) {
            return;
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

