import UserSettings from "../UserSettings";
import { keyboard } from "../platform/Keyboard";
import Point from "../math/point";
import SnapController from "../framework/SnapController";
import { PointDirection } from "../framework/Defs";
import GlobalMatrixModifier from "../framework/GlobalMatrixModifier";

export default {
    strokeStyle: UserSettings.frame.stroke,
    fillStyle: UserSettings.frame.prototypingFill,
    hitPointIndex: function (frame, event) {
        if (frame.hasBadTransform) {
            return -1;
        }

        var gm = frame.element.globalViewMatrix();
        var gmi = frame.element.globalViewMatrixInverted();
        var scale = event.view.scale();
        var elementPoint = gmi.transformPoint(event);

        for (var i = frame.points.length - 1; i >= 0; --i) {
            let p = frame.points[i];
            if (p.visible && !p.visible(p, frame, frame.element.width, frame.element.height, scale * event.view.contextScale)) {
                continue;
            }

            let pt = gm.transformPoint(p);
            if (p.type.hitTest(frame, event, pt, elementPoint, scale)) {
                return i;
            }
        }

        return -1;
    },

    updateFromElement: function (frame, view) {
        frame.hasBadTransform = frame.element.hasBadTransform();
        if (frame.hasBadTransform) {
            return;
        }

        var e = frame.element;
        var rect = frame.element.boundaryRect();
        var points = frame.points;
        var scale = view.scale();
        for (var i = 0; i < points.length; ++i) {
            var update = points[i].update || points[i].type.update;
            update(points[i], rect.x, rect.y, rect.width, rect.height, e, scale);
        }
    },

    capturePoint: function (frame, point, event) {
        frame._mousePoint = new Point(event.x, event.y);
        var scale = event.view.scale();

        var matrix = frame.element.globalViewMatrixInverted();
        frame._capturedPt = matrix.transformPoint(frame._mousePoint);
        frame._offsetPt = new Point(point.x - frame._capturedPt.x, point.y - frame._capturedPt.y);
        frame.globalViewMatrixInverted = matrix;
        frame.globalViewMatrix = frame.element.globalViewMatrix();

        point.type.capture(frame, point, event);

        frame.keyboardToken = keyboard.changed.bind(this, state => this.movePoint(frame, point, frame._mousePoint, state));
    },

    movePoint: function (frame, point, event, keys = keyboard.state) {
        if (!frame._mousePoint) {
            return;
        }
        frame._mousePoint.set(event.x, event.y);

        var pos = frame._mousePoint;
        var snapPos;
        var px = 0, py = 0;
        var scale = event.view.scale();
        if (frame.allowSnapping && !keys.ctrlKey) {
            px = frame._offsetPt.x;
            py = frame._offsetPt.y;
            pos = SnapController.applySnappingForPoint({ x: frame._mousePoint.x + px, y: frame._mousePoint.y + py });
        }
        else {
            SnapController.clearActiveSnapLines();
        }

        var matrix = frame.globalViewMatrixInverted;
        var pt = matrix.transformPoint(pos);

        var dx = 0;
        var dy = 0;
        if (point.moveDirection & PointDirection.Vertical) {
            dy = -frame._capturedPt.y + pt.y - py;
        }
        if (point.moveDirection & PointDirection.Horizontal) {
            dx = -frame._capturedPt.x + pt.x - px;
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

        delete frame._mousePoint;
        delete frame._capturedPt;
        delete frame._offsetPt;
        delete frame.globalViewMatrixInverted;
        delete frame.globalViewMatrix;
    },

    draw: function (frame, context, environment, currentPoint?) {
        var scale = environment.view.scale();

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
                    if (!p.visible || p.visible(p, frame, frame.element.width, frame.element.height, scale * environment.view.contextScale)) {
                        p.type.draw(p, frame, scale, context, matrix);
                    }
                }
            }
        }

        context.restore();
    }
}