import Shape from "framework/Shape";
import PropertyMetadata from "framework/PropertyMetadata";
import DefaultFrameType from "decorators/DefaultFrameType";
import UIElement from "framework/UIElement";
import {PointDirection, Types, FrameCursors} from "framework/Defs";
import LineDirectionPoint from "decorators/LineDirectionPoint";
import RotateFramePoint from "decorators/RotateFramePoint";
import Environment from "environment";

var radiusChanged = function (changes) {
    var r = changes.radius;
    var x = this.x() + this.width() / 2,
        y = this.y() + this.height() / 2;
    changes.x = x - r;
    changes.y = y - r;
    changes.width = 2 * r;
    changes.height = 2 * r;
};

var PolygonFrameType = {
    cursorSet: FrameCursors,
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
                context.circlePath(x * scale, y * scale, frame.element.radius() * scale);
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


class Polygon extends Shape {
    constructor() {
        super();
    }

    _updateSize(changes) {
        var oldSize = this.width();
        var width = changes.width || oldSize;
        var height = changes.height || oldSize;
        var size = Math.min(width, height);
        changes.radius = 0 | size / 2;
    }

    selectionFrameType() {
        return PolygonFrameType;
    }

    propsUpdated(changes) {
        super.propsUpdated.apply(this, arguments);
    }
    prepareProps(changes) {
        super.prepareProps.apply(this, arguments);
        if ((changes.radius)) {
            radiusChanged.call(this, changes);
        }
        else if (changes.width !== undefined || changes.height !== undefined) {
            this._updateSize(changes);
        }
    }

    radius(value) {
        if (value !== undefined) {
            this.setProps({radius: value})
        }
        return this.props.radius;
    }

    pointsCount(value) {
        if (value !== undefined) {
            this.setProps({pointsCount: value})
        }
        return this.props.pointsCount;
    }

    drawPath(context, w, h) {
        var step = 2 * Math.PI / this.pointsCount();
        var r = this.radius();
        var cx = w / 2,
            cy = h / 2;

        var x = cx + r * Math.sin(Math.PI),
            y = cy + r * Math.cos(Math.PI);

        context.beginPath();
        context.moveTo(x, y);
        for (var i = 1; i < this.pointsCount(); i++) {
            var f = Math.PI + i * step;
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

        var step = 2 * Math.PI / this.pointsCount();
        var r = this.radius();
        var cx = this.width() / 2,
            cy = this.height() / 2;

        var x = cx + r * Math.sin(Math.PI),
            y = cy + r * Math.cos(Math.PI);

        path.moveToPoint({x, y});
        for (var i = 1; i < this.pointsCount(); i++) {
            var f = Math.PI + i * step;
            x = cx + r * Math.sin(f);
            y = cy + r * Math.cos(f);
            path.lineToPoint({x, y});
        }

        path.closed(true);
        path.fill(this.fill());
        path.stroke(this.stroke());
        path.styleId(this.styleId());
        path.name(this.name());

        path.x(0);
        path.y(0);
        path.adjustBoundaries();
        path.x(path.x() + this.x());
        path.y(path.y() + this.y());
        path.angle(this.angle());

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
                    prop: 'radius',
                    limitFrom: true,
                    update: function (p, x, y, w, h, element, scale) {
                        var value = element.props[p.prop];

                        p.x = w / 2 + value;
                        p.y = h / 2;
                        p.from = {x: w / 2, y: h / 2};
                        p.to = {x: p.x, y: p.y};
                    }
                }
            ]
        }

        if (this.canRotate()) {
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
Polygon.prototype.t = Types.Polygon;

PropertyMetadata.registerForType(Polygon, {
    radius: {
        displayName: "Radius",
        defaultValue: 15,
        type: "numeric",
        useInModel: true,
        editable: true
    },
    pointsCount: {
        displayName: "Points count",
        defaultValue: 6,
        type: "numeric",
        useInModel: true,
        editable: true,
        validate: [
            {minMax: [4, 100]}
        ]
    },
    groups(element) {
        var baseType = PropertyMetadata.baseTypeName(Polygon);
        var baseGroups = PropertyMetadata.findAll(baseType).groups(element);
        return [
            {
                label: "Polygon",
                properties: ["radius", "pointsCount"]
            }
        ].concat(baseGroups);
    }
});

export default Polygon;