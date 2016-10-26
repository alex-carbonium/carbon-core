import UIElement from "framework/UIElement";
import Environment from "environment";
import SnapController from "framework/SnapController";
import {Types} from "../framework/Defs";

var debug = require("DebugUtil")("carb:resizeFramePoint");

const PointSize = 5
    , PointSize2 = 2;

export default {
    hitTest: function (frame, point, hitPoint, scale) {
        return Math.abs(point.x - hitPoint.x) < PointSize / scale && Math.abs(point.y - hitPoint.y) < PointSize / scale;
    },
    draw: function (p, frame, scale, context) {
        context.fillStyle = '#fff';
        context.strokeStyle = '#22c1ff';
        context.beginPath();
        context.rect(~~(p.x * scale - PointSize2), ~~(p.y * scale - PointSize2), PointSize, PointSize);
        context.fill();
        context.stroke();
    },
    capture: function (frame) {
        var resizingElement = UIElement.construct(Types.DraggingElement, frame.element, false, true);
        frame.resizingElement = resizingElement;
        frame.originalRect = frame.element.getBoundaryRectGlobal();
        frame.rotationOrigin = frame.element.rotationOrigin(true);
        frame.flipVertical = frame.element.flipVertical();
        frame.flipHorizontal = frame.element.flipHorizontal();
        frame.globalViewMatrix = frame.element.globalViewMatrix();
        debug("Captured global rect: x=%d y=%d w=%d h=%d", frame.originalRect.x, frame.originalRect.y, frame.originalRect.width, frame.originalRect.height);

        Environment.view.layer3.add(resizingElement);
        frame.element.startResizing();
    },
    release: function (frame) {
        if (frame.resizingElement) {
            frame.resizingElement.dropOn(null, frame.element.parent());
            frame.resizingElement.detach();
            delete frame.globalViewMatrix;
            frame.element.stopResizing();
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

        if (event.event.altKey) {
            var newOrigin = origin;
           // newWidth = newWidth + point.rv[0] * dx;
            //newHeight = newHeight + point.rv[1] * dy;
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
        frame.resizingElement.resize(rect, event.event.altKey);
        Environment.controller.resizingEvent.raise({
            element: frame.element,
            rect: rect,
            mouseX: newPoint.x,
            mouseY: newPoint.y
        });
    }
}
