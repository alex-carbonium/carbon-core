import CrazyScope from "../framework/CrazyManager";
import UIElement from "../framework/UIElement";
import Invalidate from "../framework/Invalidate";
import Environment from "../environment";
import {Types, RotationCursors} from "../framework/Defs";
import Point from "../math/point";
import {isPointInRect} from "../math/math";
import { IMouseEventData, ChangeMode, InteractionType } from "carbon-core";
import UserSettings from "../UserSettings";
import TransformationHelper from "../framework/interactions/TransformationHelper";
import BoundaryPathDecorator from "./BoundaryPathDecorator";

const PointSize = 12
     , PointSize2 = PointSize/2;

export default {
    PointSize: PointSize,
    PointSize2: PointSize2,
    cursorSet: RotationCursors,
    hitTest: function (frame, mousePoint, pt, elementPoint, scale) {
        var br = frame.element.boundaryRect();
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
    capture: function (frame, point, event: IMouseEventData) {
        frame.originalRect = frame.element.boundaryRect();
        frame.origin = frame.element.center(true);
        frame.localOrigin = frame.element.center(false);
        frame.captureVector = new Point(event.x - frame.origin.x, event.y - frame.origin.y);
        frame.initialAngle = frame.element.angle;
        if (frame.initialAngle < 0){
            frame.initialAngle = 360 + frame.initialAngle;
        }
        frame.flipped = frame.element.isFlipped(true);
        let elements;
        if (frame.element.systemType() === Types.CompositeElement) {
            elements = frame.element.children;
        } else {
            elements = [frame.element];
        }
        frame.elements = elements;
        frame.snapshot = TransformationHelper.getPropSnapshot(elements);

        event.controller.raiseInteractionStarted(InteractionType.Rotation, event);
        if (frame.element.decorators) {
            frame.element.decorators.forEach(x => x.visible = (false));
        }

        frame.element.addDecorator(frame.rotateDecorator = new BoundaryPathDecorator(event.view, true));
        Invalidate.request();
    },
    release: function (frame, point, event) {
        if (frame.element) {
            var newSnapshot = TransformationHelper.getPropSnapshot(frame.elements);
            TransformationHelper.applyPropSnapshot(frame.elements, frame.snapshot, ChangeMode.Self);
            TransformationHelper.applyPropSnapshot(frame.elements, newSnapshot, ChangeMode.Model);
            frame.element.clearSavedLayoutProps();
            frame.element.removeDecorator(frame.rotateDecorator);
            if (frame.element.decorators) {
                frame.element.decorators.forEach(x => x.visible = (true));
            }

            event.controller.raiseInteractionStopped(InteractionType.Rotation, event);
        }
    },
    change: function (frame, dx, dy, point, mousePoint, keys, event: IMouseEventData) {
        if (!frame.element) {
            return;
        }

        var v = new Point(mousePoint.x - frame.origin.x, mousePoint.y - frame.origin.y);
        var angle = v.getDirectedAngle(frame.captureVector);

        if (keys.shiftKey) {
            var fullAngle = Math.round(frame.initialAngle + angle);
            fullAngle = Math.round(fullAngle / 15) * 15;
            angle = fullAngle - frame.initialAngle;
        }
        else{
            angle = Math.round(angle);
        }

        frame.element.applyRotation(angle, frame.localOrigin, true, ChangeMode.Self);
        Invalidate.requestInteractionOnly();

        var newAngle = frame.element.angle;
        event.controller.interactionProgress.raise(InteractionType.Rotation, event, frame.element);
        event.cursor = this._getCursor(point, newAngle, frame.flipped);
    },
    _getCursor: function(point, angle, flipped){
        var cursorIndex = this.rotateCursorPointer(point.cursor, angle, flipped);
        return this.cursorSet[cursorIndex];
    }
}