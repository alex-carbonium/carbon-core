import UIElement from "framework/UIElement";
import nearestPoint from "math/NearestPoint";
import Invalidate from "framework/Invalidate";
import {Types, FrameCursors} from "../framework/Defs";
import Brush from "../framework/Brush";
import Environment from "environment";

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
        context.circle(pt.x, pt.y, PointSize);
        context.fill();
        context.stroke();
    },
    capture (frame) {
        var resizingElement = UIElement.construct(Types.ResizeRotateElement, frame.element);
        resizingElement.stroke(Brush.Empty);
        frame.resizingElement = resizingElement;
        frame.clone = frame.resizingElement.children[0];
        Environment.view.layer3.add(resizingElement);
        //App.Current.view.startRotatingEvent.raise();
    },
    release (frame) {
        if (frame.resizingElement) {
            delete frame.onlyCurrentVisible;
            frame.element.selectionFrameType().saveChanges(frame, frame.clone);

            frame.resizingElement.detach();
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
        if (!frame.resizingElement) {
            return;
        }
        var rect = frame.element.getBoundaryRect();
        var mousePosition = frame.element.globalViewMatrixInverted().transformPoint(mousePoint);

        // p1, p2, gives us line equation
        var pr = {};
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

        frame.clone.saveOrResetLayoutProps();
        frame.clone.prepareAndSetProps(r);

        Invalidate.requestUpperOnly();
    }
}