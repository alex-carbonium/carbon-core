import Polygon from "./Polygon";
import PropertyMetadata from "framework/PropertyMetadata";
import DefaultFrameType from "decorators/DefaultFrameType";
import UIElement from "framework/UIElement";
import { PointDirection, Types, FrameCursors } from "framework/Defs";
import LineDirectionPoint from "decorators/LineDirectionPoint";
import RotateFramePoint from "decorators/RotateFramePoint";
import Rect from "../math/rect";
import Point from "../math/point";
import Environment from "environment";
import { IStar } from "carbon-core";

let StarFrameType = {
    cursorSet: FrameCursors,
    draw: function (frame, context, currentPoint) {
        let external = frame.element.radius();
        let internal = frame.element.internalRadius();
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
                context.transformedEllipsePath(0, 0, external * 2, external * 2, matrix);
                context.stroke();

                context.beginPath();
                context.transformedEllipsePath(external - internal, external - internal, internal * 2, internal * 2, matrix);
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
    saveChanges: function (frame, clone) {
        let props = {
            br: clone.boundaryRect(),
            internalRadius: clone.internalRadius(),
            radius: clone.radius(),
            m: frame.element.parent.globalMatrixToLocal(clone.globalViewMatrix())
        };
        frame.element.setProps(props);
    }
}

StarFrameType = Object.assign({}, DefaultFrameType, StarFrameType);


export default class Star extends Polygon implements IStar {
    onRadiusChanged(changes) {
        super.onRadiusChanged(changes);

        let radiusRatio = this.internalRadius() / this.radius();
        if (!isNaN(radiusRatio)) {
            changes.internalRadius = changes.radius * radiusRatio;
        }
    }

    saveOrResetLayoutProps(mode): boolean {
        if (super.saveOrResetLayoutProps(mode)) {
            this.runtimeProps.origLayout.internalRadius = this.internalRadius();
            return true;
        }

        this.setProps({internalRadius: this.runtimeProps.origLayout.internalRadius}, mode);
        return false;
    }

    prepareProps(changes) {
        super.prepareProps.apply(this, arguments);

        let internalChanged = changes.hasOwnProperty("internalRadius");
        if (internalChanged) {
            changes.internalRadius = Math.round(changes.internalRadius);
            if (changes.internalRadius <= 0) {
                changes.internalRadius = 1;
            }
        }
    }

    internalRadius(value?) {
        if (value !== undefined) {
            this.setProps({ internalRadius: value })
        }
        return this.props.internalRadius;
    }

    drawPath(context, w, h) {
        let gm = this.globalViewMatrix();
        let step = Math.PI / this.pointsCount();
        let r1 = this.radius(),
            r2 = this.internalRadius();
        let cx = r1,
            cy = r1;

        let x = cx + r1 * Math.sin(Math.PI),
            y = cy + r1 * Math.cos(Math.PI);

        let p = gm.transformPoint2(x, y, true);
        context.moveTo(p.x, p.y);
        for (let i = 1; i < this.pointsCount() * 2; i++) {
            let f = Math.PI + i * step;
            let r;
            //noinspection JSBitwiseOperatorUsage
            if (i & 1) {
                r = r2;
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
        let path = UIElement.construct(Types.Path);

        let step = Math.PI / this.pointsCount();
        let r1 = this.radius(),
            r2 = this.internalRadius();
        let cx = r1,
            cy = r1;

        let x = cx + r1 * Math.sin(Math.PI),
            y = cy + r1 * Math.cos(Math.PI);

        path.moveToPoint({ x, y });
        for (let i = 1; i < this.pointsCount() * 2; i++) {
            let f = Math.PI + i * step;
            let r;
            //noinspection JSBitwiseOperatorUsage
            if (i & 1) {
                r = r2;
            } else {
                r = r1;
            }

            x = cx + r * Math.sin(f);
            y = cy + r * Math.cos(f);
            path.lineToPoint({ x, y });
        }

        path.closed(true);
        path.setProps({
            shadows:this.props.shadows,
            fill:this.fill,
            stroke:this.stroke,
            styleId:this.styleId(),
            name:this.name,
            strokeWidth:this.strokeWidth()
        });

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
                        let external = element.props[p.prop];

                        p.x = external * 2;
                        p.y = external;
                        p.from = { x: external, y: external };
                        p.to = { x: p.x, y: p.y };
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
                        let internal = element.props[p.prop];
                        let external = element.props.radius;

                        p.x = external;
                        p.y = external - internal;
                        p.from = { x: external, y: external };
                        p.to = { x: external, y: 0 };
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
    proxyDefinition:function() {
        let baseDefinition = PropertyMetadata.findForType(Polygon).proxyDefinition();
        return {
            rprops: [].concat(baseDefinition.rprops), // readonly props
            props: ["radius", "internalRadius", "pointsCount"].concat(baseDefinition.props),
            methods: [].concat(baseDefinition.methods)
        }
    },
    groups(element) {
        let baseType = PropertyMetadata.baseTypeName(Star);
        let groups = PropertyMetadata.findAll(baseType).groups(element).slice();
        groups[0] = {
            label: "Layout",
            properties: ["x", "y", "radius", "internalRadius", "pointsCount"]
        };
        return groups;
    }
});