import Shape from "framework/Shape";
import PropertyMetadata from "framework/PropertyMetadata";
import DefaultFrameType from "decorators/DefaultFrameType";
import UIElement from "framework/UIElement";
import {PointDirection, Types} from "framework/Defs";
import LineDirectionPoint from "decorators/LineDirectionPoint";
import RotateFramePoint from "decorators/RotateFramePoint";
import Environment from "environment";

var radiusChanged = function (changes) {
    var r = changes.externalRadius;
    var x = this.x() + this.width() / 2,
        y = this.y() + this.height() / 2;
    changes.x = x - r;
    changes.y = y - r;
    changes.width = 2 * r;
    changes.height = 2 * r;
};

var StarFrameType = {
    hitPointIndex: DefaultFrameType.hitPointIndex,
    updateFromElement: DefaultFrameType.updateFromElement,
    movePoint: DefaultFrameType.movePoint,
    draw: function (frame, context, currentPoint) {
        var w = frame.getWidth();
        var h = frame.getHeight();
        var x = 0 | w / 2;
        var y = 0 | h / 2;
        var scale = Environment.view.scale();

        context.save();
        context.scale(1 / scale, 1 / scale);

        if (frame.onlyCurrentVisible) {
            if (currentPoint) {
                currentPoint.type.draw(currentPoint, frame, scale, context);
            }
        }
        else {
            if (frame.frame) {
                context.save();
                context.strokeStyle = '#22c1ff';
                context.lineWidth = 1;
                context.beginPath();
                context.circlePath(x * scale, y * scale, frame.element.externalRadius() * scale);
                context.circlePath(x * scale, y * scale, frame.element.internalRadius() * scale);
                context.stroke();
                context.restore();
            }


            for (var i = frame.points.length - 1; i >= 0; --i) {
                var p = frame.points[i];
                p.type.draw(p, frame, scale, context);
            }
        }

        context.restore();
    }
}


class Star extends Shape {
    constructor() {
        super();
    }

    _updateSize(changes) {
        var radiusRatio = this._originalRatio || (this.internalRadius() / this.externalRadius());
        var oldSize = this.width();
        var width = changes.width || oldSize;
        var height = changes.height || oldSize;
        var size = Math.min(width, height);
        changes.externalRadius = 0 | size / 2;
        if (!isNaN(radiusRatio)) {
            changes.internalRadius = changes.externalRadius * radiusRatio;
        }
    }

    selectionFrameType() {
        return StarFrameType;
    }

    propsUpdated(changes) {
        super.propsUpdated.apply(this, arguments);
    }

    prepareProps(changes) {
        super.prepareProps.apply(this, arguments);
        if ((changes.externalRadius)) {
            radiusChanged.call(this, changes);
        }
        if (changes.width !== undefined || changes.height !== undefined) {
            this._updateSize(changes);
        }
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

    drawPath(context, w, h) {
        var step = Math.PI / this.pointsCount();
        var r1 = this.externalRadius(),
            r2 = this.internalRadius();
        var cx = w / 2,
            cy = h / 2;

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

    beforeAddFromToolbox() {
        this._originalRatio = (this.internalRadius() / this.externalRadius());
    }

    afterAddFromToolbox() {
        delete this._originalRatio;
    }

    convertToPath() {
        var path = UIElement.construct(Types.Path);

        var step = Math.PI / this.pointsCount();
        var r1 = this.externalRadius(),
            r2 = this.internalRadius();
        var cx = this.width() / 2,
            cy = this.height() / 2;

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

        path.x(0);
        path.y(0);
        path.adjustBoundaries();
        path.x(path.x() + this.x());
        path.y(path.y() + this.y());
        path.angle(this.angle());
        path.name(this.name());

        return path;
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
                    type: LineDirectionPoint,
                    moveDirection: PointDirection.Any,
                    x: 0,
                    y: 0,
                    cursor: 9,
                    prop: 'externalRadius',
                    limitFrom: true,
                    update: function (p, x, y, w, h, element, scale) {
                        var value = element.props[p.prop];

                        p.x = w / 2 + value;
                        p.y = h / 2;
                        p.from = {x: w / 2, y: h / 2};
                        p.to = {x: p.x, y: p.y};
                    }
                },
                {
                    type: LineDirectionPoint,
                    moveDirection: PointDirection.Any,
                    x: 0,
                    y: 0,
                    cursor: 9,
                    limitFrom: true,
                    limitTo: true,
                    prop: 'internalRadius',
                    update: function (p, x, y, w, h, element, scale) {
                        var value = element.props[p.prop];
                        var ext = element.props.externalRadius;

                        p.x = w / 2 + value;
                        p.y = h / 2;
                        p.from = {x: w / 2, y: h / 2};
                        p.to = {x: w / 2 + ext, y: h / 2};
                    },
                    change: function (frame, dx, dy, point, event) {
                        LineDirectionPoint.change(frame, dx, dy, point, event);
                    }
                }
            ]
        }

        if (this._angleEditable !== false) {
            frame.points.splice(0, 0, {
                type: RotateFramePoint,
                moveDirection: PointDirection.Any,
                x: 0,
                y: 0,
                cursor: 8,
                update: function (p, x, y, w, h) {
                    p.x = x + w / 2;
                    p.y = y;
                }
            });
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
        var baseGroups = PropertyMetadata.findAll(baseType).groups(element);
        return [
            {
                label: "Star",
                properties: ["externalRadius", "internalRadius", "pointsCount"]
            }
        ].concat(baseGroups);
    }
});

export default Star;