import UIElement from "framework/UIElement";
import Environment from "environment";
import ResizeOptions from "./ResizeOptions";
import { Types, FrameCursors } from "../framework/Defs";
import Point from "../math/point";
import Rect from "../math/rect";
import UserSettings from "../UserSettings";
import { ChangeMode, IMouseEventData, InteractionType } from "carbon-core";
import TransformationHelper from "../framework/interactions/TransformationHelper";
import BoundaryPathDecorator from "./BoundaryPathDecorator";

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
    capture: function (frame, point, event: IMouseEventData) {
        frame.viewMatrix = frame.element.viewMatrix();
        frame.globalViewMatrix = frame.element.globalViewMatrix();
        frame.isRotated = frame.element.isRotated(true);
        let elements;
        if (frame.element.systemType() === Types.SelectComposite) {
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
        frame.centerOrigin = frame.viewMatrix.transformPoint(c);
        frame.pointOrigin = frame.viewMatrix.transformPoint(frame.localOrigin);
        frame.capturedPoint = Point.create(point.x, point.y);
        frame.resizeOptions = ResizeOptions.Default;
        frame.allowSnapping = true;
        frame.element.clearSavedLayoutProps();
        frame.scalingVector = new Point(1, 1);
        //not yet determined
        frame.origin = null;

        debug("Captured rect: x=%d y=%d w=%d h=%d", frame.originalRect.x, frame.originalRect.y, frame.originalRect.width, frame.originalRect.height);

        event.view.snapController.calculateSnappingPoints(frame.element.parent.primitiveRoot(), [frame.element]);
        frame.childrenCount = frame.element.children?frame.element.children.length:-1;

        Environment.controller.raiseInteractionStarted(InteractionType.Resizing, event);
        if (frame.element.decorators) {
            frame.element.decorators.forEach(x => x.visible = (false));
        }

        frame.element.addDecorator(frame.resizeDecorator = new BoundaryPathDecorator(event.view, true));
        frame.element.invalidate();
    },
    release: function (frame, point, event: IMouseEventData) {
        if (frame.element) {
            if (frame.origin) {
                let finalOptions = frame.resizeOptions.withFinal(true);
                frame.element.applyScaling(frame.scalingVector, frame.origin, finalOptions, ChangeMode.Model);
            }

            Environment.controller.raiseInteractionStopped(InteractionType.Resizing, event);

            frame.element.clearSavedLayoutProps();
            delete frame.globalViewMatrix;
            delete frame.viewMatrix;
            frame.element.removeDecorator(frame.resizeDecorator);
            if (frame.element.decorators) {
                frame.element.decorators.forEach(x => x.visible = (true));
            }
            frame.element.resetGlobalViewCache();
        }
    },
    rotateCursorPointer: function (index, angle) {
        var dc = ~~(((360 - angle + 23) % 360) / 45);
        return (index + dc) % 8;
    },
    change: function (frame, dx, dy, point, mousePoint, keys, event: IMouseEventData) {
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

        if (keys.altKey){
            frame.origin = frame.centerOrigin;
            dx *= 2;
            dy *= 2;
        }
        else {
            frame.origin = frame.pointOrigin;
        }

        frame.scalingVector.set(1 + dx / frame.originalRect.width, 1 + dy / frame.originalRect.height);

        var round = !frame.isRotated && UserSettings.snapTo.enabled && UserSettings.snapTo.pixels;
        if (round) {
            var oldRect = frame.originalBoundingBox;
            var newRect = oldRect.scale(frame.scalingVector, frame.origin).roundMutable();
            var minWidth = frame.element.minWidth();
            var minHeight = frame.element.minHeight();

            if (minWidth && newRect.width < minWidth) {
                newRect.width = minWidth;
            }

            if (minHeight && newRect.height < minHeight) {
                newRect.height = minHeight;
            }
            frame.scalingVector.set(newRect.width / oldRect.width, newRect.height / oldRect.height);
        }

        frame.resizeOptions = ResizeOptions.Default.withRounding(round && frame.globalViewMatrix.isTranslatedOnly());
        frame.element.applyScaling(frame.scalingVector, frame.origin, frame.resizeOptions, ChangeMode.Self);

        if (keys.altKey) {
            // When resizing (for example) text, it can change its width and get misplaced.
            // Therefore, it is checked whether the center is still the same after scaling.
            let br = frame.element.boundaryRect();
            let c = frame.element.viewMatrix().transformPoint(br.center());
            let d = frame.centerOrigin.subtract(c).roundMutable();
            if (d.x || d.y) {
                frame.element.applyTranslation(d, false, ChangeMode.Self);
            }
        }

        if(frame.childrenCount >= 0 && frame.childrenCount !== frame.element.children.length) {
            event.view.snapController.calculateSnappingPoints(frame.element.parent.primitiveRoot(), [frame.element]);
        }

        Environment.controller.raiseInteractionProgress(InteractionType.Resizing, event);
    }
}
