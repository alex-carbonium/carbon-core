import UIElement from "framework/UIElement";
import nearestPoint from "math/NearestPoint";
import Invalidate from "framework/Invalidate";
import {Types, FrameCursors} from "../framework/Defs";
import Brush from "../framework/Brush";
import { ChangeMode } from "carbon-core";

const PointSize = 4;

export default  {
    cursorSet: FrameCursors,
    hitTest (frame, mousePoint, pt, elementPoint, scale) {
        return Math.abs(mousePoint.x - pt.x) < PointSize / scale && Math.abs(mousePoint.y - pt.y) < PointSize / scale;
    },

    draw (p, frame, scale, context, matrix) {
        context.fillStyle = '#fff';
        context.strokeStyle = '#22c1ff';
        context.beginPath();
        var pt = matrix.transformPoint2(p.x, p.y, true);
        pt.roundToNearestHalf();
        context.circle(pt.x, pt.y, PointSize);
        context.fill();
        context.stroke();
    },
    capture (frame) {
        delete frame.originalValue;
        if (frame.element.decorators) {
            frame.element.decorators.forEach(x => x.visible = (false));
        }
    },
    release (frame, point) {
        if (frame.element) {
            delete frame.onlyCurrentVisible;
            let r = {};
            r[point.prop] = frame.originalValue;
            let currentValue = frame.element.props[point.prop];

            frame.element.prepareAndSetProps(r, ChangeMode.Self);
            r = {};
            r[point.prop] = currentValue;
            frame.element.prepareAndSetProps(r, ChangeMode.Model);
            if (frame.element.decorators) {
                frame.element.decorators.forEach(x => x.visible = (true));
            }
        }
    },
    rotateCursorPointer (index, angle) {
        return index;
    },
    update: function (p, x, y, w, h, element, scale) {
        var value = element.props[p.prop];

        p.x = w / 2 + value;
        p.y = h / 2;
    },
    change (frame, dx, dy, point, mousePoint, keys) {
        if (!frame.element) {
            return;
        }
        var rect = frame.element.boundaryRect();
        var mousePosition = frame.globalViewMatrixInverted.transformPoint(mousePoint);

        // p1, p2, gives us line equation
        var pr:any = {};
        var p1 = point.from;
        var p2 = point.to;
        // pr - closest point to the line
        nearestPoint.onLine(p1, p2, mousePosition, pr, true);

        // find segment parameter
        var parameter = nearestPoint.segmentParameter(p1, p2, pr);
        if (parameter < 0 && point.limitFrom) {
            parameter = 0;
            point.x = p1.x;
            point.y = p1.y;
        } else if (parameter > 1 && point.limitTo) {
            parameter = 1;
            point.x = p2.x;
            point.y = p2.y;
        } else {
            point.x = pr.x;
            point.y = pr.y;
        }

        var newRadius = nearestPoint.pointDistance(p1, point);

        var r = {};
        r[point.prop] = newRadius;

        if(!frame.originalValue) {
            frame.originalValue = frame.element.props[point.prop];
        }

        frame.element.prepareAndSetProps(r, ChangeMode.Self);

        Invalidate.requestInteractionOnly();
    }
}