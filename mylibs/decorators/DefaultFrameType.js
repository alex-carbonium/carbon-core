import {PointDirection} from "framework/Defs";
import CrazyScope from "framework/CrazyManager";
import Environment from "environment";

export default {
    strokeStyle: '#22c1ff',
    hitPointIndex: function (frame, point) {
        var matrix = frame.element.globalViewMatrix().clone();
        var sw = 1, sh = 1;
        if (frame.element.flipHorizontal()) {
            sw = -1;
        }
        if (frame.element.flipVertical()) {
            sh = -1;
        }

        if (sw !== 1 || sh !== 1) {
            matrix.scale(sw, sh, frame.element.width() / 2, frame.element.height() / 2);
        }
        matrix.invert();

        point = matrix.transformPoint(point);

        var scale = Environment.view.scale();

        for (var i = 0; i < frame.points.length; ++i) {
            var p = frame.points[i];
            if (p.type.hitTest(frame, point, p, scale)) {
                return i;
            }
        }

        return -1;
    },
    updateFromElement: function (frame) {
        var e = frame.element;
        var x = 0,
            y = 0,
            w = e.width(),
            h = e.height();
        var points = frame.points;
        var scale = Environment.view.scale();
        for (var i = 0; i < points.length; ++i) {
            var update = points[i].update || points[i].type.update;
            update(points[i], x, y, w, h, e, scale);
        }
    },

    movePoint: function (frame, point, event) {
        var matrix = (frame.globalViewMatrix || frame.element.globalViewMatrix()).clone();
        var sw = 1, sh = 1;
        if (frame.element.flipHorizontal()) {
            sw = -1;
        }
        if (frame.element.flipVertical()) {
            sh = -1;
        }

        if (sw !== 1 || sh !== 1) {
            matrix.scale(sw, sh, frame.element.width() / 2, frame.element.height() / 2);
        }
        matrix.invert();

        var pt = matrix.transformPoint(event);

        var dx = 0;
        var dy = 0;
        if (point.moveDirection & PointDirection.Vertical) {
            dy = -point.y + pt.y;
        }
        if (point.moveDirection & PointDirection.Horizontal) {
            dx = -point.x + pt.x;
        }

        point.type.change(frame, dx, dy, point, event);
    },
    draw: function (frame, context, currentPoint) {
        var x = 0;
        var y = 0;
        var w = frame.getWidth();
        var h = frame.getHeight();
        var scale = Environment.view.scale();

        context.save();
        context.scale(1 / scale, 1 / scale);
        var scaleX = 1, scaleY = 1;
        if (!frame.element.scalableX()) {
            scaleX = scale;
        }

        if (!frame.element.scalableY()) {
            scaleY = scale;
        }

        if (frame.onlyCurrentVisible) {
            if (currentPoint) {
                currentPoint.type.draw(currentPoint, frame, scale, context);
            }
        }
        else {
            if (frame.frame) {
                context.save();
                CrazyScope.push(false);
                context.strokeStyle = this.strokeStyle;
                context.lineWidth = 1;
                context.rectPath(~~(x * scale), ~~(y * scale), ~~(w * scale / scaleX), ~~(h * scale / scaleY));
                context.stroke();
                CrazyScope.pop();
                context.restore();
            }

            for (var i = frame.points.length - 1; i >= 0; --i) {
                var p = frame.points[i];
                p.type.draw(p, frame, scale, context);
            }
        }

        context.restore();
    }
}