import UIElement from "framework/UIElement";
import Invalidate from "framework/Invalidate";
import Environment from "environment";
import {Types, FrameCursors} from "../framework/Defs";

const PointSize = 5
    , PointSize2 = 2;

export default {
    cursorSet: FrameCursors,
    hitTest: function (frame, point, hitPoint, scale) {
        return Math.abs(point.x - hitPoint.x) < PointSize / scale && Math.abs(point.y - hitPoint.y) < PointSize / scale;
    },
    draw: function (p, frame, scale, context) {
        context.fillStyle = 'yellow';
        context.strokeStyle = '#000';
        context.save();

        context.beginPath();
        var x = ~~((p.x) * scale - PointSize2);
        var y = ~~((p.y) * scale - PointSize2);
        context.translate(x + PointSize2, y + PointSize2);
        context.rotate(Math.PI / 4);
        context.translate(-x - PointSize2, -y - PointSize2);
        context.rect(x, y, PointSize, PointSize);
        context.fill();
        context.stroke();
        context.restore();
    },
    capture: function (frame, point) {
        var resizingElement = UIElement.construct(Types.DraggingElement, frame.element);
        frame.resizingElement = resizingElement;

        Environment.view.layer3.add(resizingElement);
        point.capture(frame);
    },
    release: function (frame, point) {
        point.release(frame);
        if (frame.resizingElement) {
            frame.resizingElement.detach();
        }
    },
    rotateCursorPointer: function (index, angle) {
        return index;
    },
    change: function (frame, dx, dy, point, mousePoint, keys) {
        point.change(frame, dx, dy, point, mousePoint, keys);
        Invalidate.requestUpperOnly();
    }
}