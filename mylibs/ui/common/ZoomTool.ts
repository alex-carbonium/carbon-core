import Tool from "./Tool";
import { IMouseEventData, IController, IView, IApp } from "carbon-core";
import domUtil from "../../utils/dom";
import { SelectFrame } from "../../framework/SelectFrame";
import Brush from "../../framework/Brush";
import UserSettings from "../../UserSettings";
import Point from "../../math/point";

var debug = require("../../DebugUtil")("carb:zoomTool");

var setCursor = function (zoomout, event: IMouseEventData) {
    var cursor = zoomout ? "zoom_out" : "zoom_in";
    event.cursor = cursor;
};

export default class ZoomTool extends Tool {
    private _zoomFrame: SelectFrame;
    private _mousepressed: boolean;
    private _added: boolean;

    constructor(app: IApp, view: IView, controller: IController) {
        super("zoomTool", app, view, controller);
        this._zoomFrame = new SelectFrame();
        this._zoomFrame.fill = (Brush.createFromCssColor(UserSettings.zoom.frameColor))
        this._zoomFrame.onComplete.bind(this, this.onZoomRect);
    }

    pause() {
    }

    resume() {
    }

    onZoomRect(rect, keyboardState) {
        let view = this.view;
        let scale = view.getScaleToFitRect(rect, 1);
        view.scale(scale);

        let pt = Point.allocate(rect.x + rect.width / 2, rect.y + rect.height / 2);
        view.scrollToPoint(pt);
        pt.free();
    }

    attach(mousePressed?: boolean) {
        this._attach();
        this._mousepressed = mousePressed;

        this.controller.currentTool = "zoomTool";
    }

    detach() {
        this._detach();
        this._mousepressed = false;
        if (this._added) {
            this._added = false;
            this.view.interactionLayer.remove(this._zoomFrame);
        }
    }

    mousedown(event: IMouseEventData) {
        this._mousepressed = true;
        event.handled = true;
        setCursor.call(this, event.altKey, event);
        debug("Captured mouse down");
        return false; //do not let resize frame to fire
    }

    click(event: IMouseEventData) {
        let view = this.view;
        var sx = view.scrollX,
            sy = view.scrollY;
        var layerX = domUtil.layerX(event.event, view);
        var layerY = domUtil.layerY(event.event, view);
        let oldValue = view.scale();
        var x = (layerX + sx) / oldValue;
        var y = (layerY + sy) / oldValue;
        var viewport = view.viewportSize();
        if (event.altKey) {
            view.zoomOutStep();
        } else {
            view.zoomInStep();
        }

        var scroll = App.Current.activePage.pointToScroll({ x: x, y: y }, viewport);
        view.scrollX = (scroll.scrollX);
        view.scrollY = (scroll.scrollY);
    }

    mouseup(event: IMouseEventData) {
        event.handled = true;
        this._mousepressed = false;
        debug("Released on mouse up");
        if(this._added) {
            this._added = false;
            this._zoomFrame.complete(event);
            event.view.interactionLayer.remove(this._zoomFrame);
        }
    }

    mousemove(event: IMouseEventData) {
        if (this._mousepressed && !event.altKey) {
            if(!this._added) {
                this._added = true;
                event.view.interactionLayer.add(this._zoomFrame);
                this._zoomFrame.init(event);
            } else {
                this._zoomFrame.update(event);
            }
        }
        setCursor.call(this, event.altKey, event);
        event.handled = true;
    }
}
