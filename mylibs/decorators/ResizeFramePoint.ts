import UIElement from "framework/UIElement";
import Environment from "environment";
import SnapController from "framework/SnapController";
import ResizeOptions from "./ResizeOptions";
import { Types, FrameCursors } from "../framework/Defs";
import Point from "../math/point";
import Rect from "../math/rect";
import UserSettings from "../UserSettings";
import { ChangeMode } from "carbon-core";
import TransformationHelper from "../framework/interactions/TransformationHelper";

var debug = require("DebugUtil")("carb:resizeFramePoint");

const PointSize = 6
    , PointSize2 = 3.5;


export default {
    cursorSet: FrameCursors,
    hitTest: function (frame, mousePoint, pt, elementPoint, scale) {
        return Math.abs(mousePoint.x - pt.x) < PointSize / scale && Math.abs(mousePoint.y - pt.y) < PointSize / scale;
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
        let elements;
        if (frame.element.systemType() === Types.CompositeElement) {
            elements = frame.element.children;
        } else {
            elements = [frame.element];
        }
        frame.elements = elements;
        frame.snapshot = TransformationHelper.getPropSnapshot(elements);

        if (!frame.isRotated && UserSettings.snapTo.enabled && UserSettings.snapTo.pixels) {
            frame.element.roundBoundingBoxToPixelEdge();
        }

        var br = frame.element.boundaryRect();
        frame.originalRect = br;
        frame.originalBoundingBox = frame.element.getBoundingBoxGlobal();

        var c = br.center();
        frame.localOrigin = c.subtract(new Point(br.width / 2 * point.rv[0], br.height / 2 * point.rv[1]));
        frame.centerOrigin = frame.element.globalViewMatrix().transformPoint(c);
        frame.pointOrigin = frame.element.globalViewMatrix().transformPoint(frame.localOrigin);
        frame.capturedPoint = Point.create(point.x, point.y);
        frame.resizeOptions = ResizeOptions.Default;
        frame.allowSnapping = true;

        debug("Captured rect: x=%d y=%d w=%d h=%d", frame.originalRect.x, frame.originalRect.y, frame.originalRect.width, frame.originalRect.height);

        SnapController.calculateSnappingPoints(frame.element.parent().primitiveRoot(), frame.element);

        //Environment.view.interactionLayer.add(resizingElement);
        frame.element.startResizing({ transformationElement: frame.element });
        if (frame.element.decorators) {
            frame.element.decorators.forEach(x => x.visible(false));
        }
    },
    release: function (frame) {
        if (frame.element) {
            var newSnapshot = TransformationHelper.getPropSnapshot(frame.elements);
            TransformationHelper.applyPropSnapshot(frame.elements, frame.snapshot, ChangeMode.Self);
            TransformationHelper.applyPropSnapshot(frame.elements, newSnapshot, ChangeMode.Model);
            //frame.resizingElement.saveChanges();
            // frame.resizingElement.detach();
            //ImageContent depends on event fired in the end
            frame.element.stopResizing({ transformationElement: frame.element });
            frame.element.clearSavedLayoutProps();
            delete frame.globalViewMatrix;
            if (frame.element.decorators) {
                frame.element.decorators.forEach(x => x.visible(true));
            }
        }
    },
    rotateCursorPointer: function (index, angle) {
        var dc = ~~(((360 - angle + 23) % 360) / 45);
        return (index + dc) % 8;
    },
    change: function (frame, dx, dy, point, mousePoint, keys) {
        var rv = point.rv;

        if (keys.shiftKey && frame.originalRect.width && frame.originalRect.height) {
            var p1 = frame.localOrigin;
            var p2 = frame.capturedPoint.add2(dx, dy);

            if (rv[0] === 0) {
                let scale = (p2.y - frame.capturedPoint.y) / frame.originalRect.height;
                dx = scale * frame.originalRect.width * rv[1];
            }
            else if (rv[1] === 0) {
                let scale = (p2.x - frame.capturedPoint.x) / frame.originalRect.width;
                dy = scale * frame.originalRect.height * rv[0];
            }
            else {
                var boundary = Rect.fromPoints(p1, p2);
                var fit = frame.originalRect.fit(boundary);

                dx = (fit.width - frame.originalRect.width) * rv[0];
                dy = (fit.height - frame.originalRect.height) * rv[1];
            }

            rv = [rv[0] || 1, rv[1] || 1];
        }

        dx *= rv[0];
        dy *= rv[1];

        var origin;       
        if (keys.altKey){
            origin = frame.centerOrigin;
            dx *= 2;
            dy *= 2;
        }
        else {
            origin = frame.pointOrigin;
        }

        var s = new Point(1 + dx / frame.originalRect.width, 1 + dy / frame.originalRect.height);

        var round = !frame.isRotated && UserSettings.snapTo.enabled && UserSettings.snapTo.pixels;
        if (round) {
            var oldRect = frame.originalBoundingBox;
            var newRect = oldRect.scale(s, origin).roundMutable();
            var minWidth = frame.element.minWidth();
            var minHeight = frame.element.minHeight();

            if (minWidth && newRect.width < minWidth) {
                newRect.width = minWidth;
            }

            if (minHeight && newRect.height < minHeight) {
                newRect.height = minHeight;
            }
            s.set(newRect.width / oldRect.width, newRect.height / oldRect.height);
        }

        var resizeOptions = frame.resizeOptions.withRounding(round && frame.globalViewMatrix.isTranslatedOnly());
        frame.element.applyScaling(s, origin, resizeOptions, ChangeMode.Self);

        if (keys.altKey) {
            // When resizing (for example) text, it can change its width and get misplaced.
            // Therefore, it is checked whether the center is still the same after scaling.
            let br = frame.originalRect;
            let c = frame.globalViewMatrix.transformPoint(br.center());
            let d = frame.centerOrigin.subtract(c).roundMutable();
            if (d.x || d.y) {
                frame.element.applyTranslation(d, false, ChangeMode.Self);
            }
        }

        Environment.controller.resizingEvent.raise({
            element: frame.element,
            transformationElement: frame.element,
            handled: false
        });
    }
}
