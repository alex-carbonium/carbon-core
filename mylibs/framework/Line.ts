import Shape from "./Shape";
import Brush from "./Brush";
import Path from "./Path";
import { PointDirection, Types, FrameCursors } from "./Defs";
import Invalidate from "./Invalidate";
import Selection from "./SelectionModel";
import SelectComposite from "./SelectComposite";
import angleAdjuster from "../math/AngleAdjuster";
import PropertyMetadata from "./PropertyMetadata";
import Rect from "../math/rect";
import Point from "../math/point";
import { ChangeMode, RenderEnvironment, ILine } from "carbon-core";
import { pointToLineDistance } from "../math/geometry";

//TODO: add line width property
//TODO: line angle should be calculated as the angle between points, not matrix angle
//TODO: when changing with shift, calculate final angle, not local

var PointSize = 6
    , PointSize2 = 3.5;

var LinePoint = {
    cursorSet: FrameCursors,
    hitTest(frame, mousepoint, pt, elementPoint, scale) {
        return Math.abs(mousepoint.x - pt.x) < PointSize / scale && Math.abs(mousepoint.y - pt.y) < PointSize / scale;
    },

    draw(p, frame, scale, context, matrix) {
        context.fillStyle = '#fff';
        context.strokeStyle = '#22c1ff';
        context.beginPath();
        var pt = matrix.transformPoint2(p.x, p.y, true);
        context.rect(pt.x - PointSize2, pt.y - PointSize2, PointSize, PointSize);
        context.fill();
        context.stroke();
    },
    capture(frame, point, event) {
        var resizingElement = frame.element.clone();
        resizingElement.setProps(frame.element.selectLayoutProps(true));
        frame.resizingElement = resizingElement;
        frame.globalViewMatrix = frame.element.globalViewMatrix();
        frame.origPointX = point.x;
        frame.origPointY = point.y;
        let box = frame.element.getBoundaryRectGlobal();
        frame._offsetX = box.x + point.x - event.x;
        frame._offsetY = box.y + point.y - event.y;

        var container = frame.element.primitiveRoot();
        if (!container && frame.element instanceof SelectComposite) {
            container = frame.element.first().primitiveRoot();
        }

        event.view.snapController.calculateSnappingPoints(container, [frame.element]);
        frame.element.setProps({visible:false}, ChangeMode.Self);
        frame.view = event.view;
        event.view.interactionLayer.add(resizingElement);
    },
    release(frame) {
        var e = frame.resizingElement;
        frame.view.snapController.clearActiveSnapLines();

        if (e) {
            var props = e.selectProps(["x1", "x2", "y1", "y2"]);
            frame.element.prepareAndSetProps(props);
            frame.element.setProps({visible:true}, ChangeMode.Self);

            frame.view.interactionLayer.remove(e);
            e.dispose();
            Selection.refreshSelection();
        }
    },
    rotateCursorPointer(index, angle) {
        return index;
    },
    change(frame, dx, dy, point, mousePoint, keys, event) {
        if (!frame.resizingElement) {
            return;
        }

        var oldx = mousePoint.x + frame._offsetX;
        var oldy = mousePoint.y + frame._offsetY;
        if (keys.ctrlKey) {
            var newPoint = { x: oldx, y: oldy };
        }
        else if (keys.shiftKey) {
            var p;
            var oldPointLocal = frame.element.globalViewMatrixInverted().transformPoint2(mousePoint.x, mousePoint.y);
            if (point.p === 1) {
                p = new Point(frame.element.x2(), frame.element.y2());
            } else {
                p = new Point(frame.element.x1(), frame.element.y1());
            }
            newPoint = angleAdjuster.adjust(p, oldPointLocal);

            dx += newPoint.x - oldPointLocal.x;
            dy += newPoint.y - oldPointLocal.y;
        }
        else {
            newPoint = event.view.snapController.applySnappingForPoint({ x: oldx, y: oldy });
            dx += newPoint.x - oldx;
            dy += newPoint.y - oldy;
        }

        point.x = Math.round(frame.origPointX + dx);
        point.y = Math.round(frame.origPointY + dy);

        frame.resizingElement.saveOrResetLayoutProps(ChangeMode.Self);
        point.updateElement(frame.resizingElement, dx, dy);
        Invalidate.requestInteractionOnly();
    }
}


class Line extends Shape implements ILine {

    shouldApplyViewMatrix() {
        return false;
    }

    applySizeScaling(s, o, options, changeMode) {
        this.applyMatrixScaling(s, o, options, changeMode);
    }

    saveOrResetLayoutProps(mode): boolean {
        if (super.saveOrResetLayoutProps(mode)) {
            this.runtimeProps.origLayout.x1 = this.x1();
            this.runtimeProps.origLayout.x2 = this.x2();
            this.runtimeProps.origLayout.y1 = this.y1();
            this.runtimeProps.origLayout.y2 = this.y2();
            return true;
        }

        this.x1(this.runtimeProps.origLayout.x1);
        this.x2(this.runtimeProps.origLayout.x2);
        this.y1(this.runtimeProps.origLayout.y1);
        this.y2(this.runtimeProps.origLayout.y2);
        return false;
    }

    isBadBoundaryRect(br) {
        return false;
    }

    hitTest(/*Point*/point, view) {
        if (!this.visible || this.hasBadTransform()) {
            return false;
        }

        var matrix = this.globalViewMatrixInverted();
        var pt = matrix.transformPoint(point);
        var rect = this.boundaryRect();

        let dw = 0;
        if (view.scale() <= 1) {
            dw = 4;
        }

        var d = (dw + this.strokeWidth() || 1);

        if (!(pt.x + d > rect.x && pt.x - d < rect.x + rect.width && pt.y + d > rect.y && pt.y - d < rect.y + rect.height)) {
            return false;
        }

        var distance = pointToLineDistance(pt, this.x1(), this.y1(), this.x2(), this.y2());
        return -distance < d && distance <= 0;
    }

    set width(value: number) {
        this._width(value);
    }
    _width(value: number, changeMode?: ChangeMode) {
        this.x2(this.x1() + value, changeMode);
    }

    get width() {
        return Math.abs(this.x2() - this.x1());
    }

    get height() {
        return Math.abs(this.y2() - this.y1());
    }

    set height(value:number) {
        this._height(value);
    }

    _height(value?: number, changeMode?: ChangeMode) {
        this.y2(this.y1() + value, changeMode);
    }

    allowCaching() {
        return false;
    }

    getSnapPoints(local) {
        if (!this.allowSnapping()) {
            return null;
        }

        if (this.runtimeProps.snapPoints) {
            return this.runtimeProps.snapPoints;
        }

        let rect = this.getBoundaryRectGlobal();
        let x = rect.x,
            y = rect.y,
            width = rect.width,
            height = rect.height;
        let origin = this.rotationOrigin(true);

        if (local) {
            x = 0;
            y = 0;
            origin.x -= rect.x;
            origin.y -= rect.y;
        }

        return this.runtimeProps.snapPoints = {
            xs: [Math.round(x), Math.round(x + width)],
            ys: [Math.round(y), Math.round(y + height)],
        };
    }

    canConvertToPath() {
        return true;
    }

    convertToPath() {
        var path = new Path();
        var l = this.x,
            t = this.y,
            x1 = this.x1(),
            y1 = this.y1(),
            x2 = this.x2(),
            y2 = this.y2();

        path.addPoint({ x: l + x1, y: t + y1 });
        path.addPoint({ x: l + x2, y: t + y2 });

        path.stroke = (this.stroke);
        path.adjustBoundaries();
        path.name = (this.name);
        path.setProps(this.selectLayoutProps());
        path.strokeWidth(this.strokeWidth());
        path.runtimeProps.ctxl = this.runtimeProps.ctxl;

        return path;
    }

    drawPath(context, w, h) {
        var x1 = this.x1(),
            y1 = this.y1(),
            x2 = this.x2(),
            y2 = this.y2();

        var m = this.globalViewMatrix();
        var p1 = m.transformPoint2(x1, y1, true);
        var p2 = m.transformPoint2(x2, y2, true);

        var stroke = this.stroke;
        if (stroke) {
            var dw = this.strokeWidth() / 2;
            var vx = p2.x - p1.x;
            var vy = p2.y - p1.y;

            var d = Math.sqrt(vx * vx + vy * vy);
            vx = vx / d * dw;
            vy = vy / d * dw;
            var t = vx;
            vx = vy;
            vy = -t;

            p1.x += vx;
            p2.x += vx;
            p1.y += vy;
            p2.y += vy;
        }

        context.beginPath();
        context.linePath(p1.x, p1.y, p2.x, p2.y);
    }

    drawSelf(context, w, h, environment: RenderEnvironment) {
        context.save();

        var dashPattern = this.dashPattern();
        if (dashPattern) {
            context.setLineDash(dashPattern);
        }

        context.lineWidth = this.strokeWidth();
        context.lineCap = this.lineCap;
        context.lineJoin = this.lineJoin;
        context.miterLimit = this.props.miterLimit;

        this.drawPath(context, w, h);

        Brush.stroke(this.stroke, context, 0, 0, w, h);

        context.restore();
    }

    x1(value?, changeMode?: ChangeMode) {
        if (value !== undefined) {
            this.setProps({ x1: value }, changeMode);
        }
        return this.props.x1;
    }

    y1(value?, changeMode?: ChangeMode) {
        if (value !== undefined) {
            this.setProps({ y1: value }, changeMode);
        }
        return this.props.y1;
    }

    x2(value?, changeMode?: ChangeMode) {
        if (value !== undefined) {
            this.setProps({ x2: value }, changeMode);
        }
        return this.props.x2;
    }

    y2(value?, changeMode?: ChangeMode) {
        if (value !== undefined) {
            this.setProps({ y2: value }, changeMode);
        }
        return this.props.y2;
    }

    _roundValue(v) {
        return Math.round(v);
    }

    prepareProps(changes) {
        Shape.prototype.prepareProps.apply(this, arguments);

        var hasX1 = changes.hasOwnProperty("x1");
        var hasX2 = changes.hasOwnProperty("x2");
        var hasY1 = changes.hasOwnProperty("y1");
        var hasY2 = changes.hasOwnProperty("y2");

        if (hasX1 || hasX2 || hasY1 || hasY2) {
            changes.x1 = this._roundValue(hasX1 ? changes.x1 : this.x1());
            changes.x2 = this._roundValue(hasX2 ? changes.x2 : this.x2());
            changes.y1 = this._roundValue(hasY1 ? changes.y1 : this.y1());
            changes.y2 = this._roundValue(hasY2 ? changes.y2 : this.y2());

            var minX = Math.min(changes.x1, changes.x2);
            var maxX = Math.max(changes.x1, changes.x2);
            var minY = Math.min(changes.y1, changes.y2);
            var maxY = Math.max(changes.y1, changes.y2);
            changes.br = new Rect(minX, minY, maxX - minX || 0, maxY - minY || 0)
        }
    }

    createSelectionFrame(view) {

        if (!this.selectFrameVisible()) {
            return {
                element: this,
                frame: false,
                points: []
            }
        }

        var that = this;
        var frame = {
            element: this,
            frame: false,
            points: [
                {
                    type: LinePoint,
                    moveDirection: PointDirection.Any,
                    x: 0,
                    y: 0,
                    cursor: 10,
                    p: 1,
                    update(p, x, y) {
                        p.x = Math.round(that.x1());
                        p.y = Math.round(that.y1());
                    },
                    updateElement(e, dx, dy) {
                        e.x1(e.x1() + dx);
                        e.y1(e.y1() + dy);
                    }
                },
                {
                    type: LinePoint,
                    moveDirection: PointDirection.Any,
                    x: 0,
                    y: 0,
                    p: 2,
                    cursor: 10,
                    update(p, x, y) {
                        p.x = Math.round(that.x2());
                        p.y = Math.round(that.y2());
                    },
                    updateElement(e, dx, dy) {
                        e.x2(e.x2() + dx);
                        e.y2(e.y2() + dy);
                    }
                }
            ]
        };

        return frame;
    }
}
Line.prototype.t = Types.Line;

PropertyMetadata.registerForType(Line, {
    x1: {
        displayName: "start x",
        defaultValue: 0,
        useInModel: true
    },
    y1: {
        displayName: "start y",
        defaultValue: 0,
        useInModel: true
    },
    x2: {
        displayName: "end x",
        defaultValue: 0,
        useInModel: true
    },
    y2: {
        displayName: "end y",
        defaultValue: 0,
        useInModel: true
    },
    prepareVisibility: function (element) {
        return {
            fill: false
        };
    },
    groups() {
        return [
            {
                label: "",
                id:"layout",
                properties: ["position", "size"],
                expanded: true
            },
            {
                label: "@constraints",
                properties: ["constraints"]
            },
            {
                label: "Appearance",
                expanded: false,
                properties: ["fill", "stroke", "strokeWidth", "dashPattern", "lineCap", "opacity"]
            }
        ];
    }
});


export default Line;

