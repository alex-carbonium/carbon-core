import SystemConfiguration from "../../SystemConfiguration";
import Selection from "../../framework/SelectionModel";
import Invalidate from "../../framework/Invalidate";
import SnapController from "../../framework/SnapController";
import Environment from "../../environment";
import Tool from "./Tool";
import Artboard from "../../framework/Artboard";
import ObjectFactory from "../../framework/ObjectFactory";
import {ViewTool} from "../../framework/Defs";
import Rect from "../../math/rect";
import Point from "../../math/point";
import {IKeyboardState, IMouseEventData} from "carbon-core";
import Cursors from "Cursors";

export default class ArtboardsTool extends Tool {
    [name: string]: any;

    constructor(type, parameters?) {
        super(ViewTool.Artboard);
        this._type = type;
        this._parameters = parameters;
        this._point = new Point(0, 0);
    }

    attach(app, view, controller, mousePressed) {
        super.attach(app, view, controller, mousePressed);
        SnapController.calculateSnappingPoints(app.activePage);

        this._enableArtboardSelection(true);
    }

    detach() {
        super.detach.apply(this, arguments);
        SnapController.clearActiveSnapLines();
        Selection.unselectAll();
        this._enableArtboardSelection(false);
    }

    _enableArtboardSelection(value: boolean){
        this._app.activePage.getAllArtboards().forEach(x => x.allowArtboardSelection(value));
    }

    mousedown(event: IMouseEventData, keys: IKeyboardState) {
        this._cursorNotMoved = true;

        var artboard = this._app.activePage.getArtboardAtPoint(event);
        if (artboard){
            if (!Selection.isElementSelected(artboard)){
                this._selectByClick(event, keys);
            }
            return true;
        }

        this._mousepressed = true;
        this._prepareMousePoint(event, keys);

        this._startPoint = {x: this._point.x, y: this._point.y};
        this._nextPoint = {x: this._point.x, y: this._point.y};
        this._element = ObjectFactory.fromType(this._type);
        this._element.allowArtboardSelection(true);
        this._app.activePage.nameProvider.assignNewName(this._element);
        this._cursorNotMoved = true;

        var defaultSettings = this._app.defaultShapeSettings();
        if (defaultSettings && !this._element.noDefaultSettings) {
            this._element.setProps(defaultSettings);
        }

        if (this._parameters){
            this._element.setProps(this._parameters);
        }

        event.handled = true;
        return false;
    }

    mouseup(event: IMouseEventData, keys: IKeyboardState) {
        this._mousepressed = false;
        this._ratioResizeInfo = null;

        if (this._element) {
            var element = this._element;
            this._element = null;
            Invalidate.requestInteractionOnly();
            var w = element.width()
                , h = element.height();
            if (w > 0 && h > 0) {
                var pos = element.position();
                this._view.activeLayer.dropToLayer(pos.x, pos.y, element);
                Selection.makeSelection([element]);
                SnapController.calculateSnappingPoints(this._app.activePage);
            }

            if (SystemConfiguration.ResetActiveToolToDefault) {
                this._app.resetCurrentTool();
            }

            SnapController.clearActiveSnapLines();
        }
    }

    mousemove(event: IMouseEventData, keys: IKeyboardState) {
        if (event.cursor){ //active frame
            return true;
        }

        var artboard = this._app.activePage.getArtboardAtPoint(event);
        if (!artboard){
            event.cursor = Cursors.ArtboardTool;
        }

        if (!this._mousepressed){
            return true;
        }

        this._prepareMousePoint(event, keys);

        if (this._mousepressed) {
            if (this._cursorNotMoved) {
                this._cursorNotMoved = (this._point.y === this._startPoint.y) && (this._point.x === this._startPoint.x);
            }
            //if use holds shift, we must fit shape into square
            if (keys.shift) {
                var height = Math.abs(this._point.y - this._startPoint.y);
                var width = Math.abs(this._point.x - this._startPoint.x);
                var ration = Math.min(height, width);

                var x = this._startPoint.x + ration;
                var y = this._startPoint.y + ration;

                this._nextPoint = {x: x, y: y};
            } else {
                this._nextPoint = {x: this._point.x, y: this._point.y};
            }

            Invalidate.requestInteractionOnly();
            event.handled = true;
            return false;
        }
    }

    click(event: IMouseEventData, keys: IKeyboardState){
        this._selectByClick(event, keys);

        event.handled = true;
    }

    _selectByClick(event: IMouseEventData, keys: IKeyboardState){
        var artboard = this._app.activePage.getArtboardAtPoint(event);

        if (artboard !== null) {
            var addToSelection = keys.shift;
            if (addToSelection) {
                Selection.selectionMode("add");
            }
            Selection.makeSelection([artboard]);
            if (addToSelection) {
                Selection.selectionMode("new");
            }

            event.cursor = Cursors.Move;
        }
    }

    _prepareMousePoint(event: IMouseEventData, keys: IKeyboardState) {
        this._point.set(event.x, event.y);
        if (!keys.ctrl) {
            var snapped = SnapController.applySnappingForPoint(this._point);
            if (snapped !== this._point) {
                this._point.set(snapped.x, snapped.y);
            }
        }
        this._point.roundMutable();
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

            if (w === 0 || h === 0){
                return;
            }

            context.save();

            var props = {x: x, y: y, width: w, height: h};
            this._element.resetTransform();
            this._element.prepareAndSetProps({br: new Rect(0, 0, w, h)});
            this._element.applyTranslation(new Point(x, y));

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

