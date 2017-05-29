import Polygon from "./Polygon";
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
        var external = frame.element.radius();
        var internal = frame.element.internalRadius();
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
                context.transformedEllipsePath(0, 0, external * 2, external * 2, matrix);
                context.stroke();

                context.beginPath();
                context.transformedEllipsePath(external - internal, external - internal, internal * 2, internal * 2, matrix);
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
            br: clone.boundaryRect(),
            internalRadius: clone.internalRadius(),
            radius: clone.radius(),
            m: frame.element.parent().globalMatrixToLocal(clone.globalViewMatrix())
        };
        frame.element.setProps(props);
    }
}
StarFrameType = Object.assign({}, DefaultFrameType, StarFrameType);


export default class Star extends Polygon {
    onRadiusChanged(changes) {
        super.onRadiusChanged(changes);

        var radiusRatio = this.internalRadius() / this.radius();
        if (!isNaN(radiusRatio)) {
            changes.internalRadius = changes.radius * radiusRatio;
        }
    }

    saveOrResetLayoutProps(): boolean{
        if (super.saveOrResetLayoutProps()){
            this.runtimeProps.origLayout.internalRadius = this.internalRadius();
            return true;
        }

        this.internalRadius(this.runtimeProps.origLayout.internalRadius);
        return false;
    }

    prepareProps(changes) {
        super.prepareProps.apply(this, arguments);

        var internalChanged = changes.hasOwnProperty("internalRadius");
        if (internalChanged){
            changes.internalRadius = Math.round(changes.internalRadius);
            if (changes.internalRadius <= 0){
                changes.internalRadius = 1;
            }
        }
    }

    internalRadius(value?) {
        if (value !== undefined) {
            this.setProps({internalRadius: value})
        }
        return this.props.internalRadius;
    }

    drawPath(context, w, h) {
        var gm = this.globalViewMatrix();
        var step = Math.PI / this.pointsCount();
        var r1 = this.radius(),
            r2 = this.internalRadius();
        var cx = r1,
            cy = r1;

        var x = cx + r1 * Math.sin(Math.PI),
            y = cy + r1 * Math.cos(Math.PI);

        context.beginPath();
        var p = gm.transformPoint2(x, y, true);
        context.moveTo(p.x, p.y);
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
            p = gm.transformPoint2(x, y, true);
            context.lineTo(p.x, p.y);
        }
        context.closePath();
    }

    convertToPath() {
        var path = UIElement.construct(Types.Path);

        var step = Math.PI / this.pointsCount();
        var r1 = this.radius(),
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
        if (!this.isInEditMode()) {
            return super.selectionFrameType();
        }
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
                        var external = element.props.radius;

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
    }
}
Star.prototype.t = Types.Star;

PropertyMetadata.registerForType(Star, {
    radius: {
        displayName: "External radius",
        defaultValue: 15,
        type: "numeric",
    },
    internalRadius: {
        displayName: "Internal radius",
        defaultValue: 6,
        type: "numeric",
    },
    pointsCount: {
        displayName: "Points count",
        defaultValue: 5,
        type: "numeric",
        options: {
            min: 4,
            max: 20
        }
    },
    groups(element) {
        var baseType = PropertyMetadata.baseTypeName(Star);
        var groups = PropertyMetadata.findAll(baseType).groups(element).slice();
        groups[0] = {
            label: "Layout",
            properties: ["x", "y", "radius", "internalRadius", "pointsCount"]
        };
        return groups;
    }
});