import SystemConfiguration from "../../SystemConfiguration";
import Selection from "../../framework/SelectionModel";
import Invalidate from "../../framework/Invalidate";
import {ViewTool} from "../../framework/Defs";
import Point from "../../math/point";
import Path from "framework/Path";
import Environment from "../../environment";
import Tool from "./Tool";
import {KeyboardState, IMouseEventData} from "carbon-core";

var Line = function (p1, p2) {
    return {
        a: p1.y - p2.y,
        b: p2.x - p1.x,
        c: p1.x * p2.y - p1.y * p2.x
    };
};

var PerpendicularDistance = function (p, l) {
    return Math.abs(l.a * p.x + l.b * p.y + l.c) / Math.sqrt(l.a * l.a + l.b * l.b);
};

// removes unnecessary points
function DouglasPeucker(PointList, epsilon) {
    //Find the point with the maximum distance

    var dmax = 0;
    var index = 0;
    if (PointList.length <= 2) {
        return PointList;
    }
    var line = Line(PointList[0], PointList[PointList.length - 1]);
    for (var i = 1; i < PointList.length - 1; ++i) {
        var d = PerpendicularDistance(PointList[i], line);
        if (d > dmax) {
            index = i;
            dmax = d;
        }
    }

    //If max distance is greater than epsilon, recursively simplify
    if (dmax >= epsilon) {
        //Recursive call
        var recResults1 = DouglasPeucker(PointList.slice(0, index + 1), epsilon);
        var recResults2 = DouglasPeucker(PointList.slice(index, PointList.length), epsilon);

        // Build the result list
        var ResultList = recResults1.concat(recResults2.slice(1, recResults2.length));
    }
    else {
        ResultList = [PointList[0], PointList[PointList.length - 1]];
    }

    //Return the result
    return ResultList;
};

export default class PencilCreator extends Tool {
    [name: string]: any;

    constructor() {
        super(ViewTool.Pencil);

        this.points = [];
        this._element = null;
        this._position = null;
    }

    defaultCursor(): string{
        return "pen";
    }

    mousedown(event) {
        var eventData = { handled: false, x: event.x, y: event.y };
        Environment.controller.startDrawingEvent.raise(eventData);
        if (eventData.handled) {
            return true;
        }

        this._mousepressed = true;
        this.points.push({ x: event.x, y: event.y });
        event.handled = true;

        var element = new Path();
        this._app.activePage.nameProvider.assignNewName(element);
        Environment.view.dropToLayer(event.x, event.y, element);
        this._element = element;
        this._position = new Point(event.x, event.y);

        return false;
    }
    mouseup(event) {
        this._mousepressed = false;
        event.handled = true;
        var view = this.view();
        var scale = view.scale();

        var element = this._element;
        if (!element){
            return;
        }
        var defaultSettings = App.Current.defaultShapeSettings();
        if (defaultSettings) {
            element.setProps(defaultSettings);
        }

        var points = DouglasPeucker(this.points, 1.5 / scale);

        if (points.length > 1) {
            var elementX = this._position.x;
            var elementY = this._position.y;

            element.addPoint({ x: points[0].x - elementX, y: points[0].y - elementY });

            for (var i = 1; i < points.length - 1; ++i) {
                // build Bezier helper points for smoothing
                var p1 = points[i - 1];
                var p2 = points[i + 1];
                var p = points[i];
                var sm = Path.smoothPoint(p, p1, p2, 3 / scale);

                element.addPoint({ x: sm.x - elementX, y: sm.y - elementY });
            }
            element.addPoint({ x: points[points.length - 1].x - elementX, y: points[points.length - 1].y - elementY });

            element.adjustBoundaries();
            Invalidate.requestInteractionOnly();
            Selection.makeSelection([element]);
        }
        else {
            element.parent().remove(element);
        }
        this.points = [];
        if (SystemConfiguration.ResetActiveToolToDefault) {
            App.Current.resetCurrentTool();
        }
    }
    mousemove(event: IMouseEventData) {
        super.mousemove(event);

        if (this._mousepressed) {
            var x = event.x
                , y = event.y;
            this.points.push({ x: x, y: y });
            Invalidate.requestInteractionOnly();
            event.handled = true;
        }
    }
    detach(){
        super.detach();
        this._mousepressed = false;
        this.points = [];
    }
    layerdraw(context) {
        if (this._mousepressed) {
            context.save();
            var pt = this.points[0];
            context.beginPath();
            context.fillStyle = "black";
            context.moveTo(pt.x, pt.y);
            for (var i = 1; i < this.points.length; ++i) {
                pt = this.points[i];
                context.lineTo(pt.x, pt.y);
            }
            context.stroke();
            context.restore();
        }
    }
}