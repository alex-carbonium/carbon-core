import UIElement from "framework/UIElement";
import Environment from "environment";
import SnapController from "framework/SnapController";
import ResizeOptions from "./ResizeOptions";
import {Types, FrameCursors} from "../framework/Defs";
import Point from "../math/point";
import Rect from "../math/rect";
import {fitRect} from "../math/Fitting";
import DefaultSettings from "../DefaultSettings";

var debug = require("DebugUtil")("carb:resizeFramePoint");

const PointSize = 6
    , PointSize2 = 3;

export default {
    cursorSet: FrameCursors,
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
        frame.globalViewMatrix = frame.element.globalViewMatrix();
        frame.isRotated = frame.element.isRotated(true);

        if (!frame.isRotated && DefaultSettings.snapTo.enabled && DefaultSettings.snapTo.pixels){
            frame.element.roundBoundingBoxToPixelEdge();
        }

        var resizingElement = UIElement.construct(Types.TransformationElement, frame.element);

        var br = frame.element.br();
        frame.resizingElement = resizingElement;
        frame.originalRect = br;
        frame.originalBoundingBox = frame.element.getBoundingBoxGlobal();

        var c = br.center();
        frame.localOrigin = c.subtract(new Point(br.width/2 * point.rv[0], br.height/2 * point.rv[1]));
        frame.centerOrigin = frame.element.globalViewMatrix().transformPoint(c);
        frame.pointOrigin = frame.element.globalViewMatrix().transformPoint(frame.localOrigin);
        frame.capturedPoint = Point.create(point.x, point.y);
        frame.resizeOptions = ResizeOptions.Default;
        frame.allowSnapping = true;

        debug("Captured rect: x=%d y=%d w=%d h=%d", frame.originalRect.x, frame.originalRect.y, frame.originalRect.width, frame.originalRect.height);

        SnapController.calculateSnappingPoints(Environment.view.page.getActiveArtboard());

        Environment.view.layer3.add(resizingElement);
        frame.resizingElement.startResizing({interactiveElement: frame.resizingElement});
    },
    release: function (frame) {
        if (frame.resizingElement) {
            frame.resizingElement.saveChanges();
            frame.resizingElement.detach();
            //FrameContent depends on event fired in the end
            frame.resizingElement.stopResizing({interactiveElement: frame.resizingElement});
            delete frame.globalViewMatrix;
        }
    },
    rotateCursorPointer: function (index, angle) {
        var dc = ~~(((360 - angle + 23) % 360) / 45);
        return (index + dc) % 8;
    },
    change: function (frame, dx, dy, point, mousePoint, keys) {
        var rv = point.rv;

        if (keys.shift && frame.originalRect.width && frame.originalRect.height) {
            var p1 = frame.localOrigin;
            var p2 = frame.capturedPoint.add2(dx, dy);

            if (rv[0] === 0){
                let scale = (p2.y - frame.capturedPoint.y)/frame.originalRect.height;
                dx = scale * frame.originalRect.width * rv[1];
            }
            else if (rv[1] === 0){
                let scale = (p2.x - frame.capturedPoint.x)/frame.originalRect.width;
                dy = scale * frame.originalRect.height * rv[0];
            }
            else{
                var boundary = Rect.fromPoints(p1, p2);
                var fit = fitRect(frame.originalRect, boundary);

                dx = (fit.width - frame.originalRect.width) * rv[0];
                dy = (fit.height - frame.originalRect.height) * rv[1];
            }

            rv = [rv[0] || 1, rv[1] || 1];
        }

        dx *= rv[0];
        dy *= rv[1];

        var origin;
        if (keys.alt){
            origin = frame.centerOrigin;
            dx *= 2;
            dy *= 2;
        }
        else{
            origin = frame.pointOrigin;
        }

        var s = new Point(1 + dx/frame.originalRect.width, 1 + dy/frame.originalRect.height);

        var round = !keys.ctrl && !frame.isRotated && DefaultSettings.snapTo.enabled && DefaultSettings.snapTo.pixels;
        if (round){
            var oldRect = frame.originalBoundingBox;
            var newRect = oldRect.scale(s, origin).roundMutable();
            s.set(newRect.width/oldRect.width, newRect.height/oldRect.height);
        }

        var resizeOptions = frame.resizeOptions.withRounding(round && frame.globalViewMatrix.isTranslatedOnly());
        frame.resizingElement.applyScaling(s, origin, resizeOptions);

        Environment.controller.resizingEvent.raise({
            element: frame.element,
            interactiveElement: frame.resizingElement,
            rect: frame.resizingElement.getBoundaryRect()
        });
    }
}
