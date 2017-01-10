import {PointDirection} from "framework/Defs";
import CrazyScope from "framework/CrazyManager";
import Environment from "environment";
import UserSettings from "../UserSettings";
import UIElement from "../framework/UIElement";
import Keyboard from "../platform/Keyboard";
import Point from "../math/point";

export default {
    strokeStyle: UserSettings.frame.stroke,
    hitPointIndex: function (frame, point) {
        var matrix = frame.element.globalViewMatrixInverted();
        point = matrix.transformPoint(point);

        var scale = Environment.view.scale();

        for (var i = frame.points.length - 1; i >= 0; --i) {
            var p = frame.points[i];
            if (p.type.hitTest(frame, point, p, scale)) {
                return i;
            }
        }

        return -1;
    },
    updateFromElement: function (frame) {
        var e = frame.element;
        var rect = frame.element.getBoundaryRect();
        var points = frame.points;
        var scale = Environment.view.scale();
        for (var i = 0; i < points.length; ++i) {
            var update = points[i].update || points[i].type.update;
            update(points[i], rect.x, rect.y, rect.width, rect.height, e, scale);
        }
    },

    capturePoint: function(frame, point, event){
        frame._lastChange = {frame, point, dx: 0, dy: 0};
        frame._mousePoint = new Point(event.x, event.y);

        point.type.capture(frame, point, frame._mousePoint);

        frame.keyboardToken = Keyboard.changed.bind(this, state => this.movePoint(frame, point, frame._mousePoint, state));
    },
    movePoint: function (frame, point, event, keys = Keyboard.state) {
        frame._mousePoint.set(event.x, event.y);

        var matrix = frame.element.globalViewMatrixInverted();
        var pt = matrix.transformPoint(event);

        var dx = 0;
        var dy = 0;
        if (point.moveDirection & PointDirection.Vertical) {
            dy = -point.y + pt.y;
        }
        if (point.moveDirection & PointDirection.Horizontal) {
            dx = -point.x + pt.x;
        }

        frame._lastChange.dx = dx;
        frame._lastChange.dy = dy;

        point.type.change(frame, dx, dy, point, frame._mousePoint, keys);
    },
    releasePoint: function(frame, point){
        point.type.release(frame, point);

        frame.keyboardToken.dispose();
    },

    draw: function (frame, context, currentPoint) {
        var scale = Environment.view.scale();

        context.save();
        context.scale(1/scale, 1/scale);

        var matrix = frame.element.globalViewMatrix().prependedWithScale(scale, scale);

        if (frame.onlyCurrentVisible) {
            if (currentPoint) {
                currentPoint.type.draw(currentPoint, frame, scale, context, matrix);
            }
        }
        else {
            if (frame.frame) {
                if (this.strokeStyle){
                    context.save();
                    context.strokeStyle = this.strokeStyle;
                    context.lineWidth = 1;
                    frame.element.drawBoundaryPath(context, matrix);
                    context.stroke();
                    context.restore();
                }
            }

            for (var i = frame.points.length - 1; i >= 0; --i) {
                var p = frame.points[i];
                p.type.draw(p, frame, scale, context, matrix);
            }
        }

        context.restore();
    }
}