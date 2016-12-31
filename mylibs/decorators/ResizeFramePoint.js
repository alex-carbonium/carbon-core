import UIElement from "framework/UIElement";
import SelectComposite from "framework/SelectComposite";
import Environment from "environment";
import SnapController from "framework/SnapController";
import {Types} from "../framework/Defs";
import Point from "../math/point";

var debug = require("DebugUtil")("carb:resizeFramePoint");

const PointSize = 6
    , PointSize2 = 3;

export default {
    hitTest: function (frame, point, hitPoint, scale) {
        return Math.abs(point.x - hitPoint.x) < PointSize / scale && Math.abs(point.y - hitPoint.y) < PointSize / scale;
    },
    draw: function (p, frame, scale, context, matrix) {
        context.fillStyle = '#fff';
        context.strokeStyle = '#22c1ff';
        context.beginPath();
        var pt = matrix.transformPoint2(p.x, p.y, true);
        context.rect(pt.x - PointSize2, pt.y - PointSize2, PointSize, PointSize);
        context.fill();
        context.stroke();
    },
    capture: function (frame, point) {
        var resizingElement = UIElement.construct(Types.TransformationElement, frame.element);
        var br = frame.element.br();
        frame.resizingElement = resizingElement;
        frame.originalRect = br;
        frame.globalViewMatrix = frame.element.globalViewMatrix();

        var c = br.center();
        var pointOrigin = c.subtract(new Point(br.width/2 * point.rv[0], br.height/2 * point.rv[1]));
        frame.centerOrigin = frame.element.globalViewMatrix().transformPoint(c);
        frame.pointOrigin = frame.element.globalViewMatrix().transformPoint(pointOrigin);

        debug("Captured rect: x=%d y=%d w=%d h=%d", frame.originalRect.x, frame.originalRect.y, frame.originalRect.width, frame.originalRect.height);

        Environment.view.layer3.add(resizingElement);
        frame.resizingElement.startResizing();
    },
    release: function (frame) {
        if (frame.resizingElement) {
            frame.resizingElement.stopResizing();
            frame.resizingElement.saveChanges();
            frame.resizingElement.detach();
            delete frame.globalViewMatrix;
        }
    },
    rotateCursorPointer: function (index, angle) {
        var dc = ~~(((angle + 23) % 360) / 45);
        return (index + dc) % 8;
    },
    change: function (frame, dx, dy, point, event) {
        if (!frame.resizingElement) {
            return;
        }


        dx *= point.rv[0];
        dy *= point.rv[1];

        var origin;
        if (event.event.altKey){
            origin = frame.centerOrigin;
            dx *= 2;
            dy *= 2;
        }
        else{
            origin = frame.pointOrigin;
        }

        var s = new Point(1 + dx/frame.originalRect.width, 1 + dy/frame.originalRect.height);
        frame.resizingElement.applyScaling(s, origin, true, true);

        Environment.controller.resizingEvent.raise({
            element: frame.element,
            rect: frame.resizingElement.getBoundaryRect()
        });
    }
}
