import CrazyScope from "framework/CrazyManager";
import UIElement from "framework/UIElement";
import Invalidate from "framework/Invalidate";
import Environment from "environment";
import {Types} from "../framework/Defs";

const PointSize = 5
    , PointSize2 = 2;

export default {
    hitTest: function (frame, point, hitPoint, scale) {
        var dh = -20;
        var height = frame.element.height();
        if (height < 0) {
            dh = -dh;
        }
        return Math.abs(point.x - hitPoint.x) < PointSize / scale && Math.abs(point.y - hitPoint.y - dh / scale) < PointSize / scale;
    },
    draw: function (p, frame, scale, context) {
        CrazyScope.push(false);
        context.strokeStyle = '#22c1ff';
        context.lineWidth = 1;
        context.setLineDash([2, 2]);
        var xs = ~~(p.x * scale);
        var dh = -20;
        var height = frame.element.height();
        if (height < 0) {
            dh = -dh;
        }
        var ys = ~~(p.y * scale + dh);
        context.linePath(xs, ys, xs, 0);
        context.stroke();
        CrazyScope.pop();

        context.fillStyle = '#fff';

        context.beginPath();
        context.arc(xs, ys, PointSize2, 0, 2 * Math.PI);
        context.fill();
        context.stroke();
    },
    rotateCursorPointer: function (index, angle) {
        return index;
    },
    capture: function (frame) {
        var resizingElement = UIElement.construct(Types.DraggingElement, frame.element);
        frame.resizingElement = resizingElement;
        frame.originalRect = frame.element.getBoundaryRectGlobal();

        Environment.view.layer3.add(resizingElement);
        Environment.controller.startRotatingEvent.raise();
    },
    release: function (frame) {
        if (frame.resizingElement) {
            frame.resizingElement.detach();
            frame.resizingElement.dropOn(null, frame.element.parent());
            Environment.controller.stopRotatingEvent.raise();
        }
    },
    change: function (frame, dx, dy, point, event) {
        if (!frame.resizingElement) {
            return;
        }

        var origin = frame.element.rotationOrigin(true);

        var v = {x: event.x - origin.x, y: event.y - origin.y};

        var angle = ~~((180 - Math.atan2(v.x, v.y) / Math.PI * 180) % 360 + 0.5);

        if (frame.element.height() < 0) {
            angle -= 180;
        }

        if (event.event.shiftKey) {
            angle = ~~(angle / 15) * 15;
        }


        frame.resizingElement.angle(angle);
        Invalidate.requestUpperOnly();
        Environment.controller.rotatingEvent.raise({element: frame.element, angle: angle, mouseX: event.x, mouseY: event.y});
    }
}