import CrazyScope from "framework/CrazyManager";
import UIElement from "framework/UIElement";
import Invalidate from "framework/Invalidate";
import Environment from "environment";
import {Types} from "../framework/Defs";
import Point from "../math/point";
import {isPointInRect} from "../math/math";

const PointSize = 20
    , PointSize2 = PointSize/2;

export default {
    hitTest: function (frame, point, hitPoint, scale) {
        var br = frame.element.getBoundaryRect();
        if (isPointInRect(br, point)){
            return false;
        }
        var size = PointSize2/scale;
        return point.x >= hitPoint.x - size && point.x <= hitPoint.x + size
            && point.y >= hitPoint.y - size && point.y <= hitPoint.y + size;
    },
    draw: function (p, frame, scale, context, matrix) {
        // var pt = matrix.transformPoint2(p.x, p.y, true);
        // context.beginPath();
        // context.rect(pt.x - PointSize2, pt.y - PointSize2, PointSize, PointSize);
        // context.fillStyle = 'red';
        // context.fill();
    },
    rotateCursorPointer: function (index, angle) {
        return index;
    },
    capture: function (frame, point, event) {
        var resizingElement = UIElement.construct(Types.TransformationElement, frame.element);
        frame.resizingElement = resizingElement;
        frame.originalRect = frame.element.getBoundaryRect();
        frame.origin = frame.element.center(true);
        frame.captureVector = new Point(event.x - frame.origin.x, event.y - frame.origin.y);

        Environment.view.layer3.add(resizingElement);
        Environment.controller.startRotatingEvent.raise();
    },
    release: function (frame) {
        if (frame.resizingElement) {
            frame.resizingElement.detach();
            frame.resizingElement.saveChanges();
            Environment.controller.stopRotatingEvent.raise();
        }
    },
    change: function (frame, dx, dy, point, event) {
        if (!frame.resizingElement) {
            return;
        }

        var v = new Point(event.x - frame.origin.x, event.y - frame.origin.y);
        var angle = v.getDirectedAngle(frame.captureVector);

        if (event.event.shiftKey) {
            angle = ~~(angle / 15) * 15;
        }

        frame.resizingElement.applyRotation(angle, frame.origin, true);
        Invalidate.requestUpperOnly();
        Environment.controller.rotatingEvent.raise({element: frame.element, angle: angle, mouseX: event.x, mouseY: event.y});
    }
}