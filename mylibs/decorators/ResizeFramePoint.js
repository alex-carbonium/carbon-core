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
        var resizingElement = UIElement.construct(Types.TransformationElement, frame.transformElements || [frame.element]);
        frame.resizingElement = resizingElement;
        frame.originalRect = frame.element.getBoundaryRectGlobal();
        frame.rotationOrigin = frame.element.rotationOrigin(true);
        frame.flipVertical = frame.element.flipVertical();
        frame.flipHorizontal = frame.element.flipHorizontal();
        frame.globalViewMatrix = frame.element.globalViewMatrix();

        var c = new Point(frame.element.width()/2, frame.element.height()/2);
        var pointOrigin = c.subtract(new Point(frame.element.width()/2 * point.rv[0], frame.element.height()/2 * point.rv[1]));
        frame.centerOrigin = frame.element.globalViewMatrix().transformPoint(c);
        frame.pointOrigin = frame.element.globalViewMatrix().transformPoint(pointOrigin);

        debug("Captured global rect: x=%d y=%d w=%d h=%d", frame.originalRect.x, frame.originalRect.y, frame.originalRect.width, frame.originalRect.height);

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

        var oldx = event.x;
        var oldy = event.y;
        if ((event.event.ctrlKey || event.event.metaKey)) {
            var newPoint = event;
        } else {
            newPoint = SnapController.applySnappingForPoint(event, frame.element.getSnapPoints(), point.rv[0] === 0, point.rv[1] === 0);
            dx += newPoint.x - oldx;
            dy += newPoint.y - oldy;
        }


        var original = frame.originalRect;
        var rect = {};
        var angle = frame.element.angle() * Math.PI / 180;

        var origin = frame.rotationOrigin;
        var mw = frame.element.minWidth();
        var mh = frame.element.minHeight();
        var newWidth = original.width + point.rv[0] * dx;
        var newHeight = original.height + point.rv[1] * dy;

        if ((dx || dy) && event.event.shiftKey && original.width && original.height) {
            var originalRatio = original.width / original.height;

            if (Math.abs(dx) > Math.abs(dy)) {
                newHeight = newWidth / originalRatio;
                dy = (newHeight - original.height) / (point.rv[1] || 1);
            } else {
                newWidth = newHeight * originalRatio;
                dx = (newWidth - original.width) / (point.rv[0] || 1);
            }
        }

        if (mw !== undefined && mw > newWidth) {
            newWidth = mw;
            dx = (mw - original.width) * point.rv[0];
        }

        if (mh !== undefined && mh > newHeight) {
            newHeight = mh;
            dy = (mh - original.height) * point.rv[1];
        }

        var newOrigin;
        if (event.event.altKey) {
            newOrigin = origin;
        } else {
            newOrigin = sketch.math2d.rotatePoint({
                x: origin.x + dx / 2,
                y: origin.y + dy / 2
            }, -angle, origin);
        }

        rect.width = Math.abs(newWidth);
        rect.height = Math.abs(newHeight);

        if (newWidth < 0) {
            frame.resizingElement.flipHorizontal(!frame.flipHorizontal);
        } else {
            frame.resizingElement.flipHorizontal(frame.flipHorizontal);
        }

        if (newHeight < 0) {
            frame.resizingElement.flipVertical(!frame.flipVertical);
        } else {
            frame.resizingElement.flipVertical(frame.flipVertical);
        }

        rect.x = newOrigin.x - rect.width / 2;
        rect.y = newOrigin.y - rect.height / 2;

        debug("Resizing rect: x=%d y=%d w=%d h=%d ow=%d dx=%d", rect.x, rect.y, rect.width, rect.height, original.width, dx);
        //var oldRect = frame.resizingElement.getBoundaryRect();
        //frame.resizingElement.resize(rect, event.event.altKey);
        //frame.resizingElement.performArrange(oldRect, frame.origin);

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
            rect: rect,
            mouseX: newPoint.x,
            mouseY: newPoint.y
        });
    }
}
