import Shape from "framework/Shape";
import PropertyMetadata from "framework/PropertyMetadata";
import DefaultFrameType from "decorators/DefaultFrameType";
import UIElement from "framework/UIElement";
import {PointDirection, Types, FrameCursors} from "framework/Defs";
import LineDirectionPoint from "decorators/LineDirectionPoint";
import RotateFramePoint from "decorators/RotateFramePoint";
import Rect from "../math/rect";
import Point from "../math/point";
import Environment from "environment";

var StarFrameType = {
    cursorSet: FrameCursors,
    draw: function (frame, context, currentPoint) {
        var r = frame.element.externalRadius();
        var x = 0 | r;
        var y = 0 | r;
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
                context.save();
                context.strokeStyle = '#22c1ff';
                context.lineWidth = 1;
                context.beginPath();
                var p = matrix.transformPoint2(x, y);
                context.circlePath(p.x, p.y, frame.element.externalRadius() * scale);
                context.stroke();

                context.beginPath();
                context.circlePath(p.x, p.y, frame.element.internalRadius() * scale);
                context.stroke();
                context.restore();
            }

            for (var i = frame.points.length - 1; i >= 0; --i) {
                var p = frame.points[i];
                p.type.draw(p, frame, scale, context, matrix);
            }
        }

        context.restore();
    },
    saveChanges: function(frame, clone){
        var props = {
            br: clone.br(),
            internalRadius: clone.internalRadius(),
            externalRadius: clone.externalRadius(),
            m: frame.element.parent().globalMatrixToLocal(clone.globalViewMatrix())
        };
        frame.element.setProps(props);
    }
}
StarFrameType = Object.assign({}, DefaultFrameType, StarFrameType);


class Star extends Shape {
    constructor() {
        super();
    }

    _externalRadiusChanged(changes) {
        var r = changes.externalRadius;
        var dr = this.externalRadius() - r;

        changes.m = this.viewMatrix().clone();
        changes.m.translate(dr, dr);

        var radiusRatio = this.internalRadius() / this.externalRadius();
        if (!isNaN(radiusRatio)) {
            changes.internalRadius = changes.externalRadius * radiusRatio;
        }
    }

    saveOrResetLayoutProps(): boolean{
        if (super.saveOrResetLayoutProps()){
            this.runtimeProps.origLayout.externalRadius = this.externalRadius();
            this.runtimeProps.origLayout.internalRadius = this.internalRadius();
            return true;
        }

        this.internalRadius(this.runtimeProps.origLayout.internalRadius);
        this.externalRadius(this.runtimeProps.origLayout.externalRadius);
        return false;
    }

    prepareProps(changes) {
        super.prepareProps.apply(this, arguments);

        var externalChanged = changes.hasOwnProperty("externalRadius");
        var countChanged = changes.hasOwnProperty("pointsCount");

        if (externalChanged){
            changes.externalRadius = Math.round(changes.externalRadius);
            if (changes.externalRadius <= 0){
                changes.externalRadius = 1;
            }
        }

        if (externalChanged) {
            this._externalRadiusChanged(changes);
        }

        if (externalChanged || countChanged){
            var r = externalChanged ? changes.externalRadius : this.externalRadius();
            var count = countChanged ? changes.pointsCount : this.pointsCount();
            changes.br = this.calculateBoundaryRect(r, count);
        }

        var internalChanged = changes.hasOwnProperty("internalRadius");
        if (internalChanged){
            changes.internalRadius = Math.round(changes.internalRadius);
            if (changes.internalRadius <= 0){
                changes.internalRadius = 1;
            }
        }
    }

    roundBoundingBoxToPixelEdge(): boolean{
        return false;
    }

    externalRadius(value) {
        if (value !== undefined) {
            this.setProps({externalRadius: value})
        }
        return this.props.externalRadius;
    }

    internalRadius(value) {
        if (value !== undefined) {
            this.setProps({internalRadius: value})
        }
        return this.props.internalRadius;
    }

    pointsCount(value) {
        if (value !== undefined) {
            this.setProps({pointsCount: value})
        }
        return this.props.pointsCount;
    }

    calculateBoundaryRect(externalRadius, pointsCount): Rect{
        var step = 360 / pointsCount;

        var xmin = externalRadius;
        var xmax = 0;
        var ymin = -externalRadius;
        var ymax = 0;

        var center = new Point(externalRadius, externalRadius);
        var vertex = new Point(0, -externalRadius);

        for (var i = 1; i < pointsCount; i++) {
            var angle = step * i;
            vertex.set(0, -externalRadius);
            vertex.setAngle(-90 + angle);

            xmin = Math.min(xmin, vertex.x);
            xmax = Math.max(xmax, vertex.x);
            ymin = Math.min(ymin, vertex.y);
            ymax = Math.max(ymax, vertex.y);
        }

        return new Rect(xmin + externalRadius, ymin + externalRadius, xmax - xmin, ymax - ymin);
    }

    drawPath(context, w, h) {
        var step = Math.PI / this.pointsCount();
        var r1 = this.externalRadius(),
            r2 = this.internalRadius();
        var cx = r1,
            cy = r1;

        var x = cx + r1 * Math.sin(Math.PI),
            y = cy + r1 * Math.cos(Math.PI);

        context.beginPath();
        context.moveTo(x, y);
        for (var i = 1; i < this.pointsCount() * 2; i++) {
            var f = Math.PI + i * step;
            //noinspection JSBitwiseOperatorUsage
            if (i & 1) {
                var r = r2;
            } else {
                r = r1;
            }
            x = cx + r * Math.sin(f);
            y = cy + r * Math.cos(f);
            context.lineTo(x, y);
        }
        context.closePath();
    }

    canConvertToPath(){
        return true;
    }
    convertToPath() {
        var path = UIElement.construct(Types.Path);

        var step = Math.PI / this.pointsCount();
        var r1 = this.externalRadius(),
            r2 = this.internalRadius();
        var cx = r1,
            cy = r1;

        var x = cx + r1 * Math.sin(Math.PI),
            y = cy + r1 * Math.cos(Math.PI);

        path.moveToPoint({x, y});
        for (var i = 1; i < this.pointsCount() * 2; i++) {
            var f = Math.PI + i * step;
            //noinspection JSBitwiseOperatorUsage
            if (i & 1) {
                var r = r2;
            } else {
                r = r1;
            }
            x = cx + r * Math.sin(f);
            y = cy + r * Math.cos(f);
            path.lineToPoint({x, y});
        }

        path.closed(true);
        path.fill(this.fill());
        path.stroke(this.stroke());
        path.styleId(this.styleId());
        path.name(this.name());

        path.setTransform(this.viewMatrix());
        path.adjustBoundaries();

        return path;
    }

    selectionFrameType() {
        return StarFrameType;
    }

    createSelectionFrame(view) {
        var frame;
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

        frame = {
            element: this,
            frame: true,
            points: [
                {
                    type: RotateFramePoint,
                    moveDirection: PointDirection.Any,
                    x: 0,
                    y: 0,
                    cursor: 3,
                    update: function (p, x, y, w, h, element, scale) {
                        var external = element.props.externalRadius;

                        p.x = 2*external + RotateFramePoint.PointSize2/scale;
                        p.y = external;
                    }
                },
                {
                    type: LineDirectionPoint,
                    moveDirection: PointDirection.Any,
                    x: 0,
                    y: 0,
                    cursor: 10,
                    prop: 'externalRadius',
                    limitFrom: true,
                    update: function (p, x, y, w, h, element, scale) {
                        var external = element.props[p.prop];

                        p.x = external*2;
                        p.y = external;
                        p.from = {x: external, y: external};
                        p.to = {x: p.x, y: p.y};
                    }
                },
                {
                    type: LineDirectionPoint,
                    moveDirection: PointDirection.Any,
                    x: 0,
                    y: 0,
                    cursor: 10,
                    limitFrom: true,
                    limitTo: true,
                    prop: 'internalRadius',
                    update: function (p, x, y, w, h, element, scale) {
                        var internal = element.props[p.prop];
                        var external = element.props.externalRadius;

                        p.x = external;
                        p.y = external - internal;
                        p.from = {x: external, y: external};
                        p.to = {x: external, y: 0};
                    },
                    change: function (frame, dx, dy, point, mousePoint, keys) {
                        LineDirectionPoint.change(frame, dx, dy, point, mousePoint, keys);
                    }
                }
            ]
        }

        return frame;
    }
}
Star.prototype.t = Types.Star;

PropertyMetadata.registerForType(Star, {
    externalRadius: {
        displayName: "External radius",
        defaultValue: 15,
        type: "numeric",
        useInModel: true,
        editable: true
    },
    internalRadius: {
        displayName: "Internal radius",
        defaultValue: 6,
        type: "numeric",
        useInModel: true,
        editable: true
    },
    pointsCount: {
        displayName: "Points count",
        defaultValue: 5,
        type: "numeric",
        useInModel: true,
        editable: true,
        validate: [
            {minMax: [4, 100]}
        ]
    },
    groups(element) {
        var baseType = PropertyMetadata.baseTypeName(Star);
        var groups = PropertyMetadata.findAll(baseType).groups(element).slice();
        groups[0] = {
            label: "Layout",
            properties: ["x", "y", "externalRadius", "internalRadius", "pointsCount"]
        };
        return groups;
    }
});

export default Star;