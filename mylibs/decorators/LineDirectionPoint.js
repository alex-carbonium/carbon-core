import UIElement from "framework/UIElement";
import nearestPoint from "math/NearestPoint";
import commandManager from "framework/commands/CommandManager";
import Invalidate from "framework/Invalidate";
import {Types} from "../framework/Defs";
import Environment from "environment";

const PointSize = 4;

export default  {
    hitTest (frame, point, hitPoint, scale) {
        return Math.abs(point.x - hitPoint.x) < PointSize / scale && Math.abs(point.y - hitPoint.y) < PointSize / scale;
    },

    draw (p, frame, scale, context) {
        context.fillStyle = '#fff';
        context.strokeStyle = '#22c1ff';
        context.beginPath();
        context.circle(~~(p.x * scale ), ~~(p.y * scale), PointSize);
        context.fill();
        context.stroke();
    },
    capture (frame) {
        var resizingElement = UIElement.construct(Types.DraggingElement, frame.element);
        frame.resizingElement = resizingElement;
        resizingElement.forceDrawClone = true;
        Environment.view.layer3.add(resizingElement);
        //App.Current.view.startRotatingEvent.raise();
    },
    release (frame) {
        if (frame.resizingElement) {
            delete frame.onlyCurrentVisible;
            var clone = frame.resizingElement._clone;
            var oldProps = {};
            var props = frame.element.getPropsDiff(clone.props, oldProps);

            frame.element.setProps(props);
            commandManager.execute(frame.element.constructPropsChangedCommand(props, oldProps));

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
    change (frame, dx, dy, point, mousePoint) {
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
        r[point.prop] = newRadius

        frame.resizingElement._clone.prepareProps(r);
        frame.resizingElement._clone.setProps(r);

        if(r.x !== undefined || r.y !== undefined) {
            var globalPoint = frame.resizingElement._element.parent().local2global(r);
            r.x = globalPoint.x || r.x;
            r.y = globalPoint.y || r.y;
        }

        frame.resizingElement.setProps(r);
        Invalidate.requestUpperOnly();
    }
}