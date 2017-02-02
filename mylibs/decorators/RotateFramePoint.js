import CrazyScope from "../framework/CrazyManager";
import UIElement from "../framework/UIElement";
import Invalidate from "../framework/Invalidate";
import Cursor from "../framework/Cursor";
import Environment from "../environment";
import {Types, RotationCursors} from "../framework/Defs";
import Point from "../math/point";
import {isPointInRect} from "../math/math";
import {IMouseEventData} from "../framework/CoreModel";

const PointSize = 20
    , PointSize2 = PointSize/2;

export default {
    cursorSet: RotationCursors,
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
        var dc = ~~(((360 - angle + 23) % 360) / 45);
        return (index + dc) % 8;
    },
    capture: function (frame, point, mousePoint) {
        var resizingElement = UIElement.construct(Types.TransformationElement, frame.element);
        frame.resizingElement = resizingElement;
        frame.originalRect = frame.element.getBoundaryRect();
        frame.origin = frame.element.center(true);
        frame.captureVector = new Point(mousePoint.x - frame.origin.x, mousePoint.y - frame.origin.y);
        frame.initialAngle = frame.element.angle();

        Environment.view.layer3.add(resizingElement);
        Environment.controller.startRotatingEvent.raise();
    },
    release: function (frame, point, event) {
        if (frame.resizingElement) {
            frame.resizingElement.detach();
            frame.resizingElement.saveChanges();

            if (Cursor.hasGlobalCursor()){
                Cursor.setCursor(Cursor.getGlobalCursor());
            }
                        
            Environment.controller.stopRotatingEvent.raise();
        }
    },
    change: function (frame, dx, dy, point, mousePoint, keys) {
        if (!frame.resizingElement) {
            return;
        }

        var v = new Point(mousePoint.x - frame.origin.x, mousePoint.y - frame.origin.y);
        var angle = v.getDirectedAngle(frame.captureVector);
        var fullAngle = Math.round(frame.initialAngle + angle);

        if (keys.shift) {
            fullAngle = Math.round(fullAngle / 15) * 15;
            angle = fullAngle - frame.initialAngle;
        }
        else{
            angle = Math.round(angle);
        }        

        frame.resizingElement.applyRotation(angle, frame.origin, true);
        Invalidate.requestUpperOnly();
        
        Environment.controller.rotatingEvent.raise({element: frame.element, angle: fullAngle, mouseX: mousePoint.x, mouseY: mousePoint.y, interactiveElement: frame.resizingElement});

        Cursor.setCursor(this._getCursor(point, fullAngle));
    },
    _getCursor: function(point, angle){
        var cursorIndex = this.rotateCursorPointer(point.cursor, angle);
        return this.cursorSet[cursorIndex];
    }
}