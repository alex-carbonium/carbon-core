import Shape from "framework/Shape";
import PropertyMetadata from "framework/PropertyMetadata";
import DefaultFrameType from "decorators/DefaultFrameType";
import UIElement from "framework/UIElement";
import { PointDirection, Types, FrameCursors } from "framework/Defs";
import LineDirectionPoint from "decorators/LineDirectionPoint";
import RotateFramePoint from "decorators/RotateFramePoint";
import Rect from "../math/rect";
import Point from "../math/point";
import Environment from "environment";
import Selection from "../framework/SelectionModel";
import { IMouseEventData, ElementState } from "carbon-core";
import Cursors from "Cursors";

let PolygonFrameType = {
    cursorSet: FrameCursors,
    draw: function (frame, context, currentPoint) {
        let r = frame.element.radius();
        let scale = Environment.view.scale();

        context.save();
        context.scale(1 / scale, 1 / scale);

        let matrix = frame.element.globalViewMatrix().prependedWithScale(scale, scale);

        if (frame.onlyCurrentVisible) {
            if (currentPoint) {
                currentPoint.type.draw(currentPoint, frame, scale, context, matrix);
            }
        }
        else {
            if (frame.frame) {
                context.save();
                context.strokeStyle = '#22c1ff';
                context.lineWidth = 1;
                context.beginPath();
                context.transformedEllipsePath(0, 0, r * 2, r * 2, matrix);
                context.stroke();
                context.restore();
            }

            for (let i = frame.points.length - 1; i >= 0; --i) {
                let p = frame.points[i];
                p.type.draw(p, frame, scale, context, matrix);
            }
        }

        context.restore();
    },
    saveChanges: function (frame, clone: Polygon) {
        let props = {
            br: clone.boundaryRect(),
            radius: clone.radius(),
            m: frame.element.parent().globalMatrixToLocal(clone.globalViewMatrix())
        };
        frame.element.setProps(props);
    }
}
PolygonFrameType = Object.assign({}, DefaultFrameType, PolygonFrameType);

export default class Polygon extends Shape {
    shouldApplyViewMatrix() {
        return false;
    }

    applySizeScaling(s, o, options, changeMode) {
        this.applyMatrixScaling(s, o, options, changeMode);
    }

    skew(): void {
    }

    prepareProps(changes) {
        super.prepareProps.apply(this, arguments);

        let radiusChanged = changes.hasOwnProperty("radius");
        let countChanged = changes.hasOwnProperty("pointsCount");

        if (radiusChanged) {
            changes.radius = Math.round(changes.radius);
            if (changes.radius <= 0) {
                changes.radius = 1;
            }
        }

        if (radiusChanged) {
            this.onRadiusChanged(changes);
        }

        if (radiusChanged || countChanged) {
            let r = radiusChanged ? changes.radius : this.radius();
            let count = countChanged ? changes.pointsCount : this.pointsCount();
            changes.br = this.calculateBoundaryRect(r, count);
        }
    }

    onRadiusChanged(changes) {
        let r = changes.radius;
        let dr = this.radius() - r;

        changes.m = this.viewMatrix().clone();
        changes.m.translate(dr, dr);
    }

    saveOrResetLayoutProps(mode): boolean {
        if (super.saveOrResetLayoutProps(mode)) {
            this.runtimeProps.origLayout.radius = this.radius();
            return true;
        }

        this.setProps({radius: this.runtimeProps.origLayout.radius}, mode);
        return false;
    }

    calculateBoundaryRect(externalRadius, pointsCount): Rect {
        let step = 360 / pointsCount;

        let xmin = externalRadius;
        let xmax = 0;
        let ymin = -externalRadius;
        let ymax = 0;

        let center = new Point(externalRadius, externalRadius);
        let vertex = new Point(0, -externalRadius);

        for (let i = 1; i < pointsCount; i++) {
            let angle = step * i;
            vertex.set(0, -externalRadius);
            vertex.setAngle(-90 + angle);

            xmin = Math.min(xmin, vertex.x);
            xmax = Math.max(xmax, vertex.x);
            ymin = Math.min(ymin, vertex.y);
            ymax = Math.max(ymax, vertex.y);
        }

        return new Rect(xmin + externalRadius, ymin + externalRadius, xmax - xmin, ymax - ymin);
    }

    roundBoundingBoxToPixelEdge(): boolean {
        return false;
    }

    mousemove(event: IMouseEventData){
        if (this.isInEditMode()){
            if (!event.cursor){
                event.cursor = Cursors.Default;
            }
        }
    }

    dblclick(event: IMouseEventData, scale) {
        if (this.isInEditMode()) {
            if (!this.hitTest(event, scale)) {
                this.mode(ElementState.Resize);
                this.releaseMouse(this);
                Selection.refreshSelection();
            }
        }
        else {
            this.mode(ElementState.Edit);
            this.captureMouse(this);
            Selection.refreshSelection();
        }
        Environment.controller.repeatLastMouseMove();
    }

    selectionFrameType(): any {
        if (!this.isInEditMode()) {
            return super.selectionFrameType();
        }
        return PolygonFrameType;
    }

    radius(value?) {
        if (value !== undefined) {
            this.setProps({ radius: value })
        }
        return this.props.radius;
    }

    pointsCount(value?) {
        if (value !== undefined) {
            this.setProps({ pointsCount: value })
        }
        return this.props.pointsCount;
    }

    drawPath(context, w, h) {
        let gm = this.globalViewMatrix();
        let step = 2 * Math.PI / this.pointsCount();
        let r = this.radius();
        let cx = r,
            cy = r;

        let x = cx + r * Math.sin(Math.PI),
            y = cy + r * Math.cos(Math.PI);

        let p = gm.transformPoint2(x, y, true);
        context.moveTo(p.x, p.y);
        for (let i = 1; i < this.pointsCount(); i++) {
            let f = Math.PI + i * step;
            x = cx + r * Math.sin(f);
            y = cy + r * Math.cos(f);
            p = gm.transformPoint2(x, y, true);
            context.lineTo(p.x, p.y);
        }
        context.closePath();
    }

    canConvertToPath() {
        return true;
    }

    convertToPath() {
        let path = UIElement.construct(Types.Path);

        let step = 2 * Math.PI / this.pointsCount();
        let r = this.radius();
        let cx = r,
            cy = r;

        let x = cx + r * Math.sin(Math.PI),
            y = cy + r * Math.cos(Math.PI);

        path.moveToPoint({ x, y });
        for (let i = 1; i < this.pointsCount(); i++) {
            let f = Math.PI + i * step;
            x = cx + r * Math.sin(f);
            y = cy + r * Math.cos(f);
            path.lineToPoint({ x, y });
        }

        path.closed(true);
        path.setProps({
            shadows:this.props.shadows,
            fill:this.fill(),
            stroke:this.stroke(),
            styleId:this.styleId(),
            name:this.name,
            strokeWidth:this.strokeWidth()
        });

        path.setTransform(this.viewMatrix());
        path.adjustBoundaries();

        return path;
    }

    createSelectionFrame(view) {
        let frame;
        if (!this.selectFrameVisible()) {
            return {
                element: this,
                frame: false,
                points: []
            }
        }

        if (view.prototyping()) {
            return {
                element: this,
                frame: true,
                points: []
            }
        }

        if (!this.isInEditMode()) {
            return super.createSelectionFrame(view);
        }

        return {
            element: this,
            frame: true,
            points: [
                {
                    type: LineDirectionPoint,
                    moveDirection: PointDirection.Any,
                    x: 0,
                    y: 0,
                    cursor: 10,
                    prop: 'radius',
                    limitFrom: true,
                    update: function (p, x, y, w, h, element, scale) {
                        let radius = element.props[p.prop];

                        p.x = radius * 2;
                        p.y = radius;
                        p.from = { x: radius, y: radius };
                        p.to = { x: p.x, y: p.y };
                    }
                }
            ]
        }
    }
}
Polygon.prototype.t = Types.Polygon;

PropertyMetadata.registerForType(Polygon, {
    radius: {
        displayName: "Radius",
        defaultValue: 15,
        type: "numeric",
    },
    pointsCount: {
        displayName: "Points count",
        defaultValue: 6,
        type: "numeric",
        options: {
            min: 3,
            max: 20
        }
    },
    groups(element) {
        let baseType = PropertyMetadata.baseTypeName(Polygon);
        let groups = PropertyMetadata.findAll(baseType).groups(element).slice();
        groups[0] = {
            label: "Layout",
            properties: ["x", "y", "radius", "pointsCount", "angle"]
        };
        return groups;
    }
});