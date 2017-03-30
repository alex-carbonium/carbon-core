import CrazyScope from "../framework/CrazyManager";
import UIElement from "../framework/UIElement";
import Invalidate from "../framework/Invalidate";
import Environment from "../environment";
import {Types, RotationCursors} from "../framework/Defs";
import Point from "../math/point";
import {isPointInRect} from "../math/math";
import {IMouseEventData} from "carbon-core";
import UserSettings from "../UserSettings";

const PointSize = 12
    , PointSize2 = PointSize/2;

export default {
    PointSize: PointSize,
    PointSize2: PointSize2,
    cursorSet: RotationCursors,
    hitTest: function (frame, mousePoint, pt, elementPoint, scale) {
        var br = frame.element.getBoundaryRect();
        if (isPointInRect(br, elementPoint)){
            return false;
        }
        return Math.abs(mousePoint.x - pt.x) < PointSize/scale && Math.abs(mousePoint.y - pt.y) < PointSize/scale;
    },
    draw: function (p, frame, scale, context, matrix) {
        if (UserSettings.internal.showRotateAreas){
            var pt = matrix.transformPoint2(p.x, p.y, true);
            context.save();
            context.beginPath();
            context.rect(pt.x - PointSize2, pt.y - PointSize2, PointSize, PointSize);
            context.globalAlpha = .2;
            context.fillStyle = 'red';
            context.fill();
            context.restore();
        }
    },
    rotateCursorPointer: function (index, angle, flipped: boolean) {
        var alpha = angle;
        if (flipped){
            alpha = 90 + angle;
            index = 8 - index;
        }

        if (alpha < 0){
            alpha = 360 + alpha;
        }
        var dc = ~~(((360 - alpha + 23) % 360) / 45);
        return (index + dc) % 8;
    },
    capture: function (frame, point, mousePoint) {
        var resizingElement = UIElement.construct(Types.ResizeRotateElement, frame.element);
        frame.resizingElement = resizingElement;
        frame.originalRect = frame.element.getBoundaryRect();
        frame.origin = frame.element.center(true);
        frame.captureVector = new Point(mousePoint.x - frame.origin.x, mousePoint.y - frame.origin.y);
        frame.initialAngle = frame.element.angle();
        if (frame.initialAngle < 0){
            frame.initialAngle = 360 + frame.initialAngle;
        }
        frame.flipped = frame.element.isFlipped(true);

        Environment.view.interactionLayer.add(resizingElement);
        Environment.controller.startRotatingEvent.raise({transformationElement: frame.resizingElement});
    },
    release: function (frame, point, event) {
        if (frame.resizingElement) {
            frame.resizingElement.detach();
            frame.resizingElement.saveChanges();

            Environment.controller.stopRotatingEvent.raise();
        }
    },
    change: function (frame, dx, dy, point, mousePoint, keys, event: IMouseEventData) {
        if (!frame.resizingElement) {
            return;
        }

        var v = new Point(mousePoint.x - frame.origin.x, mousePoint.y - frame.origin.y);
        var angle = v.getDirectedAngle(frame.captureVector);

        if (keys.shift) {
            var fullAngle = Math.round(frame.initialAngle + angle);
            fullAngle = Math.round(fullAngle / 15) * 15;
            angle = fullAngle - frame.initialAngle;
        }
        else{
            angle = Math.round(angle);
        }

        frame.resizingElement.applyRotation(angle, frame.origin, true);
        Invalidate.requestInteractionOnly();

        var newAngle = frame.resizingElement.angle();
        Environment.controller.rotatingEvent.raise({element: frame.element, angle: newAngle, mouseX: mousePoint.x, mouseY: mousePoint.y, transformationElement: frame.resizingElement});
        event.cursor = this._getCursor(point, newAngle, frame.flipped);
    },
    _getCursor: function(point, angle, flipped){
        var cursorIndex = this.rotateCursorPointer(point.cursor, angle, flipped);
        return this.cursorSet[cursorIndex];
    }
}