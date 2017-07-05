import Tool from "./Tool";
import angleAdjuster from "../../math/AngleAdjuster";
import Line from "../../framework/Line";
import { ViewTool } from "../../framework/Defs";
import SystemConfiguration from "../../SystemConfiguration";
import Selection from "../../framework/SelectionModel";
import Invalidate from "../../framework/Invalidate";
import SnapController from "../../framework/SnapController";
import Brush from "../../framework/Brush";
import Point from "../../math/point";
import Environment from "../../environment";
import UserSettings from "UserSettings";
import { IKeyboardState, IMouseEventData, ICoordinate } from "carbon-core";
import Cursors from "Cursors";

function update(x1, y1, x2, y2) {
    var props = {
        x1, x2, y1, y2
    };
    this._element.prepareProps(props);
    this._element.setProps(props);
}

function resize(x1, y1, x2, y2) {
    var minx = Math.min(x1, x2);
    var miny = Math.min(y1, y2);
    var pos = new Point(minx, miny);

    var props = {
        x1: x1 - minx,
        y1: y1 - miny,
        x2: x2 - minx,
        y2: y2 - miny
    };
    this._element.prepareProps(props);
    this._element.setProps(props);

    return pos;
}

export default class LineCreator extends Tool {
    [name: string]: any;

    constructor() {
        super(ViewTool.Line);
    }

    detach() {
        super.detach.apply(this, arguments);
        SnapController.clearActiveSnapLines();
    }
    mousedown(event: IMouseEventData, keys: IKeyboardState) {
        var eventData = { handled: false, x: event.x, y: event.y };
        Environment.controller.startDrawingEvent.raise(eventData);
        if (eventData.handled) {
            return true;
        }

        this._mousepressed = true;

        if (keys.ctrl) {
            var pos:ICoordinate = event;
        }
        else {
            pos = SnapController.applySnappingForPoint(event);
        }

        this._startPoint = { x: pos.x, y: pos.y };
        event.handled = true;
        this._element = new Line();
        App.Current.activePage.nameProvider.assignNewName(this._element);
        var defaultSettings = App.Current.defaultLineSettings();
        if (defaultSettings) {
            this._element.setProps(defaultSettings);
        }

        update.call(this, this._startPoint.x, this._startPoint.y, this._startPoint.x, this._startPoint.y);
        event.handled = true;
        return false;
    }
    mouseup(event) {
        this._mousepressed = false;
        event.handled = true;

        if (this._element) {
            Invalidate.requestInteractionOnly();
            var pos = resize.call(this, this._element.x1(), this._element.y1(), this._element.x2(), this._element.y2());

            var w = this._element.width()
                , h = this._element.height();
            if (w === 0 && h === 0) {
                return;
            }

            Environment.view.dropToLayer(pos.x, pos.y, this._element);
            var element = this._element;
            Invalidate.request();
            Selection.makeSelection([element]);
        }
        if (SystemConfiguration.ResetActiveToolToDefault) {
            App.Current.resetCurrentTool();
        }
    }
    mousemove(event: IMouseEventData, keys: IKeyboardState) {
        super.mousemove(event, keys);

        if (event.cursor !== Cursors.Pen.MovePoint){
            event.cursor = Cursors.Pen.Line;
        }

        var artboard = App.Current.activePage.getArtboardAtPoint(event);
        if (artboard !== this._hoverArtboard) {
            this._hoverArtboard = artboard;
            if (artboard) {
                SnapController.calculateSnappingPoints(artboard);
            }
        }

        if (keys.ctrl) {
            var pos:ICoordinate = event;
        }
        else {
            pos = SnapController.applySnappingForPoint(event);
        }

        if (this._mousepressed) {
            var x = pos.x,
                y = pos.y;
            if (keys.shift) {
                var point = angleAdjuster.adjust(this._startPoint, { x: x, y: y });
                x = point.x;
                y = point.y;
            }
            update.call(this, this._startPoint.x, this._startPoint.y, x, y);
            event.handled = true;
        } else {
            this._startPoint = { x: Math.round(event.x), y: Math.round(event.y) };
        }

        Invalidate.requestInteractionOnly();
    }
    layerdraw(context, environment) {
        if (this._mousepressed) {
            context.save();
            var e = this._element;
            e.applyViewMatrix(context);
            e.drawSelf(context, e.width(), e.height(), environment);
            context.restore();
        } else  {
            context.save();
            var scale = Environment.view.scale();
            context.fillStyle = UserSettings.path.pointFill;
            context.strokeStyle = UserSettings.path.pointStroke;
            context.lineWidth = 1 / scale;
            context.circle(this._startPoint.x, this._startPoint.y, 4 / scale);

            context.fill();
            context.stroke();
            context.restore();
        }
    }
}
