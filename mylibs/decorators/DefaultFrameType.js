import Environment from "environment";
import UserSettings from "../UserSettings";
import Keyboard from "../platform/Keyboard";
import Point from "../math/point";
import SnapController from "../framework/SnapController";
import { PointDirection } from "../framework/Defs";
import GlobalMatrixModifier from "../framework/GlobalMatrixModifier";

export default {
    strokeStyle: UserSettings.frame.stroke,
    fillStyle: UserSettings.frame.prototypingFill,
    hitPointIndex: function (frame, mousePoint) {
        if (frame.hasBadTransform) {
            return -1;
        }

        var gm = frame.element.globalViewMatrix();
        var gmi = frame.element.globalViewMatrixInverted();
        var scale = Environment.view.scale();
        var elementPoint = gmi.transformPoint(mousePoint);

        for (var i = frame.points.length - 1; i >= 0; --i) {
            let p = frame.points[i];
            if (p.visible && !p.visible(p, frame, frame.element.width(), frame.element.height(), scale)) {
                continue;
            }

            let pt = gm.transformPoint(p);
            if (p.type.hitTest(frame, mousePoint, pt, elementPoint, scale)) {
                return i;
            }
        }

        return -1;
    },

    updateFromElement: function (frame) {
        frame.hasBadTransform = frame.element.hasBadTransform();
        if (frame.hasBadTransform) {
            return;
        }

        var e = frame.element;
        var rect = frame.element.boundaryRect();
        var points = frame.points;
        var scale = Environment.view.scale();
        for (var i = 0; i < points.length; ++i) {
            var update = points[i].update || points[i].type.update;
            update(points[i], rect.x, rect.y, rect.width, rect.height, e, scale);
        }
    },

    capturePoint: function (frame, point, event) {
        frame._mousePoint = new Point(event.x, event.y);

        var matrix = frame.element.globalViewMatrixInverted();
        frame._capturedPt = matrix.transformPoint(frame._mousePoint);

        point.type.capture(frame, point, frame._mousePoint);

        frame.keyboardToken = Keyboard.changed.bind(this, state => this.movePoint(frame, point, frame._mousePoint, state));
    },

    movePoint: function (frame, point, event, keys = Keyboard.state) {
        frame._mousePoint.set(event.x, event.y);

        var pos = frame._mousePoint;
        if (frame.allowSnapping && !keys.ctrl) {
            pos = SnapController.applySnappingForPoint(frame._mousePoint);
        }
        else {
            SnapController.clearActiveSnapLines();
        }

        var matrix = frame.element.globalViewMatrixInverted();
        var pt = matrix.transformPoint(pos);

        var dx = 0;
        var dy = 0;
        if (point.moveDirection & PointDirection.Vertical) {
            dy = -frame._capturedPt.y + pt.y;
        }
        if (point.moveDirection & PointDirection.Horizontal) {
            dx = -frame._capturedPt.x + pt.x;
        }

        point.type.change(frame, dx, dy, point, frame._mousePoint, keys, event);
    },
    releasePoint: function (frame, point, event) {
        point.type.release(frame, point, event);

        if (frame.keyboardToken) {
            frame.keyboardToken.dispose();
            frame.keyboardToken = null;
        }
        SnapController.clearActiveSnapLines();
    },

    draw: function (frame, context, currentPoint) {
        var scale = Environment.view.scale();

        context.save();
        context.scale(1 / scale, 1 / scale);

        var matrix = frame.element.globalViewMatrix().prependedWithScale(scale, scale);

        if (frame.onlyCurrentVisible) {
            if (currentPoint) {
                currentPoint.type.draw(currentPoint, frame, scale, context, matrix);
            }
        }
        else {
            if (frame.frame) {
                if (this.strokeStyle) {
                    context.save();
                    context.strokeStyle = this.strokeStyle;
                    context.lineWidth = 1;
                    context.beginPath();
                    try {
                        GlobalMatrixModifier.push(m => matrix);
                        frame.element.drawBoundaryPath(context);
                    }
                    finally {
                        GlobalMatrixModifier.pop();
                    }
                    if (frame.fill && this.fillStyle) {
                        context.fillStyle = this.fillStyle;
                        context.fill();
                    }
                    context.stroke();
                    context.restore();
                }
            }

            if (!frame.hasBadTransform) {
                for (var i = frame.points.length - 1; i >= 0; --i) {
                    var p = frame.points[i];
                    if (!p.visible || p.visible(p, frame, frame.element.width(), frame.element.height(), scale)) {
                        p.type.draw(p, frame, scale, context, matrix);
                    }
                }
            }
        }

        context.restore();
    }
}