import Shape from "framework/Shape";
import * as rectmath from "math/math";
import QuadAndLock from "framework/QuadAndLock";
import PropertyMetadata from "framework/PropertyMetadata";
import Brush from "framework/Brush";
import {PointDirection, Types, StrokePosition} from "framework/Defs";
import nearestPoint from "math/NearestPoint";
import commandManager from "framework/commands/CommandManager";
import Path from "ui/common/Path";
import UIElement from "framework/UIElement";
import Invalidate from "framework/Invalidate";
import Environment from "environment";

const PointSize = 4;
const PointOffset = 10;

function getOffsetForPoint(w, h, scale, value) {
    var d = ((!value)?PointOffset:0) / scale;
    var rx = (w - d) / 2;
    var ry = (h - d) / 2;

    var maxRadius = Math.min(rx, ry);
    var posPercent = Math.min(value, maxRadius) / maxRadius;
    return {x: d + maxRadius * posPercent, y: d + maxRadius * posPercent};
}

var LineDirectionPoint = {
    hitTest (frame, point, hitPoint, scale) {
        return Math.abs(point.x - hitPoint.x) < PointSize / scale && Math.abs(point.y - hitPoint.y) < PointSize / scale;
    },

    draw (p, frame, scale, context) {
        context.fillStyle = '#fff';
        context.strokeStyle = '#22c1ff';
        context.beginPath();
        context.circle(~~(p.x * scale ), ~~(p.y * scale), PointSize);
        context.fill();
        context.stroke();
    },
    capture (frame) {
        var resizingElement = UIElement.construct(Types.DraggingElement, frame.element);
        frame.resizingElement = resizingElement;
        resizingElement.forceDrawClone = true;
        frame.originalValue = frame.element.cornerRadius();
        frame.onlyCurrentVisible = true;
        Environment.view.layer3.add(resizingElement);
        //App.Current.view.startRotatingEvent.raise();
    },
    release (frame) {
        if (frame.resizingElement) {
            delete frame.onlyCurrentVisible;
            var newRadius = frame.resizingElement._clone.cornerRadius();
            frame.element.cornerRadius(newRadius);
            commandManager.execute(frame.element.constructPropsChangedCommand(
                {cornerRadius: newRadius}
                , {cornerRadius: frame.originalValue}));

            frame.resizingElement.detach();
            frame.resizingElement.dropOn(null, frame.element.parent());
            Environment.controller.stopRotatingEvent.raise();
        }
    },
    rotateCursorPointer (index, angle) {
        var dc = ~~(((angle + 23) % 360) / 45);
        return (index + dc) % 8;
    },
    update: function (p, x, y, w, h, element, scale) {
        var cornderRadius = element.cornerRadius();
        var value = cornderRadius[p.prop];
        var offset = getOffsetForPoint(w, h, scale, value);

        var rv = p.rv;
        p.x = x + w * rv[0] + rv[1] * offset.x;
        p.y = y + h * rv[2] + rv[3] * offset.y;
    },
    change (frame, dx, dy, point, event) {
        if (!frame.resizingElement) {
            return;
        }
        var rect = frame.element.getBoundaryRect();
        var rv = point.rv;
        var w2 = rect.width / 2;
        var h2 = rect.height / 2;

        var mousePosition = frame.element.globalViewMatrixInverted().transformPoint(event);

        // p1, p2, gives us line equation
        var p1 = {x: rect.width * rv[0], y: rect.height * rv[2]};

        var dw = 0, dh = 0;
        if(w2 > h2){
            dw = h2 - w2;
        } else {
            dh = w2 - h2;
        }

        var p2 = {x: w2 + dw * rv[1], y: h2 + dh * rv[3]};
        var pr = {};
        // pr - closest point to the line
        nearestPoint.onLine(p1, p2, mousePosition, pr);

        // find segment parameter
        var parameter = nearestPoint.segmentParameter(p1, p2, pr);
        if (parameter < 0) {
            parameter = 0;
            point.x = p1.x;
            point.y = p1.y;
        } else if (parameter > 1) {
            parameter = 1;
            point.x = p2.x;
            point.y = p2.y;
        } else {
            point.x = pr.x;
            point.y = pr.y;
        }

        var maxRadius = Math.min(w2, h2);
        var newRadius = 0|parameter * maxRadius;

        var r = clone(frame.resizingElement._clone.cornerRadius());
        r.locked = !event.event.altKey;

        if(!r.locked) {
            r[point.prop] = newRadius;
        } else {
            r.upperLeft = newRadius;
            r.upperRight = newRadius;
            r.bottomLeft = newRadius;
            r.bottomRight = newRadius;
        }
        frame.resizingElement._clone.cornerRadius(r);
        Invalidate.requestUpperOnly();
    }
}

class Rectangle extends Shape {
    constructor() {
        super();
    }

    canConvertToPath(){
        return true;
    }
    convertToPath() {
        var path = new Path()
            , x1 = this.x()
            , y1 = this.y()
            , x2 = x1 + this.width()
            , y2 = y1 + this.height()
            , cr = this.cornerRadius();

        var mr = Math.min(this.width()/2, this.height()/2);

        if (cr.upperLeft === 0) {
            path.addPoint({x: x1, y: y1});
        } else {
            var r = Math.min(mr, cr.upperLeft);
            path.addPoint({x: x1, y: y1 + r, cp2x: x1, cp2y: y1 + 0.45 * r});
            path.addPoint({x: x1 + r, y: y1, cp1x: x1 + 0.45 * r, cp1y: y1});
        }
        if (cr.upperRight === 0) {
            path.addPoint({x: x2, y: y1});
        } else {
            r = Math.min(mr, cr.upperRight);
            path.addPoint({x: x2 - r, y: y1, cp2x: x2 - 0.45 * r, cp2y: y1});
            path.addPoint({x: x2, y: y1 + r, cp1x: x2, cp1y: y1 + 0.45 * r});
        }
        if (cr.bottomRight === 0) {
            path.addPoint({x: x2, y: y2});
        } else {
            r = Math.min(mr, cr.bottomRight);
            path.addPoint({x: x2, y: y2 - r, cp2x: x2, cp2y: y2 - 0.45 * r});
            path.addPoint({x: x2 - r, y: y2, cp1x: x2 - 0.45 * r, cp1y: y2});
        }
        if (cr.bottomLeft === 0) {
            path.addPoint({x: x1, y: y2});
        } else {
            r = Math.min(mr, cr.bottomLeft);
            path.addPoint({x: x1 + r, y: y2, cp2x: x1 + 0.45 * r, cp2y: y2});
            path.addPoint({x: x1, y: y2 - r, cp1x: x1, cp1y: y2 - 0.45 * r});
        }
        path.closed(true);
        path.fill(this.fill());
        path.stroke(this.stroke());
        path.styleId(this.styleId());
        path.name(this.name());

        path.adjustBoundaries();
        path.setProps({x:this.x(), y:this.y(), angle:this.angle()});

        return path;
    }

    cornerRadius(value) {
        if (value !== undefined) {
            this.setProps({cornerRadius: value})
        }
        return this.props.cornerRadius;
    }


    hitTest(/*Point*/point, scale) {
        if (!this.visible()) {
            return false;
        }
        var fill = this.fill();
        var stroke = this.stroke();

        if (fill && fill.type) {
            return Shape.prototype.hitTest.apply(this, arguments);
        }

        var rect = this.getHitTestBox(scale, false, false);
        var outerRect, innerRect;

        var matrix = this.globalViewMatrixInverted();
        point = matrix.transformPoint(point);

        if (stroke.position === 0) {
            outerRect = rectmath.adjustRectSize(rect, stroke.lineWidth / 2 + 1);
            innerRect = rectmath.adjustRectSize(rect, -(stroke.lineWidth / 2 + 1));
        } else if (stroke.position === 1) {
            outerRect = rectmath.adjustRectSize(rect, 1);
            innerRect = rectmath.adjustRectSize(rect, -(stroke.lineWidth + 1));
        } else {
            outerRect = rectmath.adjustRectSize(rect, stroke.lineWidth + 1);
            innerRect = rectmath.adjustRectSize(rect, -1);
        }
        return rectmath.isPointInRect(outerRect, point) && !rectmath.isPointInRect(innerRect, point);
    }

    drawSelf(context, w, h, environment) {
//                var that = this;
//                var shadow = this.shadow();
//
//                shadow.apply(context, function(context){
//                    that.drawShape(context, x, y, w, h);
//                });

        context.save();

        var dashPattern = this.dashPattern();
        if (dashPattern) {
            context.setLineDash(dashPattern);
        }
        var stroke = this.stroke();

        this.drawPath(context, w, h);
        if (w < 2 || h < 2) {
            // if the shape is too small we should not use fill brush, since borders are overlap anyway
            Brush.fill(stroke, context, 0, 0, w, h);
        } else {
            Brush.fill(this.fill(), context, 0, 0, w, h);
        }

        if (!stroke || !stroke.type || !stroke.position) {
            Brush.stroke(stroke, context, 0, 0, w, h);
        } else {
            context.beginPath();
            var lw = stroke.lineWidth;
            var db = lw / 2;
            if (stroke.position === StrokePosition.Outside) {
                lw = -lw;
                db = -db;
            }
            context.translate(db, db);
            this.drawPath(context, w - lw, h - lw);
            Brush.stroke(stroke, context, 0, 0, w - lw, h - lw);
        }

        context.restore();
    }

    drawPath(context, w, h) {
        var cornerRadius = this.cornerRadius();

        var r1 = cornerRadius.upperLeft;

        if (!cornerRadius.locked || r1) {
            var mr = Math.min(w/2, h/2);
            var r2 = cornerRadius.locked?r1:cornerRadius.upperRight,
                r3 = cornerRadius.locked?r1:cornerRadius.bottomLeft,
                r4 = cornerRadius.locked?r1:cornerRadius.bottomRight;
            context.roundedRectDifferentRadiusesPath(0, 0, w, h,
                Math.min(mr, r1),
                Math.min(mr, r2),
                Math.min(mr, r3),
                Math.min(mr, r4));
        } else {
            context.rectPath(0, 0, w, h, true);
        }
    }

    createSelectionFrame(view) {
        var frame = super.createSelectionFrame(view);

        frame.points.push({
            type: LineDirectionPoint,
            moveDirection: PointDirection.Any,
            x: 0,
            y: 0,
            cursor: 3,
            rv: [0, 1, 0, 1],
            prop: 'upperLeft'
        });

        frame.points.push({
            type: LineDirectionPoint,
            moveDirection: PointDirection.Any,
            x: 0,
            y: 0,
            cursor: 5,
            rv: [1, -1, 0, 1],
            prop: 'upperRight'
        });

        frame.points.push({
            type: LineDirectionPoint,
            moveDirection: PointDirection.Any,
            x: 0,
            y: 0,
            cursor: 7,
            rv: [1, -1, 1, -1],
            prop: 'bottomRight'
        });

        frame.points.push({
            type: LineDirectionPoint,
            moveDirection: PointDirection.Any,
            x: 0,
            y: 0,
            cursor: 1,
            rv: [0, 1, 1, -1],
            prop: 'bottomLeft'
        });

        return frame;
    }
}
Rectangle.prototype.t = Types.Rectangle;

Rectangle.ATTRIBUTE_NAMES = 'x y width height rx ry transform fill stroke stroke-width'.split(' ');
Rectangle.fromSvgElement = function (element, options) {
    var parsedAttributes = svgParser.parseAttributes(element, Rectangle.ATTRIBUTE_NAMES);
    var rect = new Rectangle();
    if (parsedAttributes.width) {
        rect.width(parsedAttributes.width);
    }
    if (parsedAttributes.height) {
        rect.height(parsedAttributes.height);
    }
    if (parsedAttributes.fill) {
        rect.fill(Brush.createFromColor(parsedAttributes.fill));
    } else {
        rect.fill(Brush.Black);
    }
    if (parsedAttributes.stroke) {
        rect.stroke(Brush.createFromColor(parsedAttributes.stroke));
    } else {
        rect.stroke(Brush.Empty);
    }

    if(parsedAttributes.opacity){
        rect.opacity(parsedAttributes.opacity);
    }

    if (parsedAttributes.x) {
        rect.x(parsedAttributes.x);
    }
    if (parsedAttributes.y) {
        rect.y(parsedAttributes.y);
    }
    return rect;
};

PropertyMetadata.registerForType(Rectangle, {
    cornerRadius: {
        displayName: "Corner radius",
        defaultValue: QuadAndLock.Default,
        type: "quadAndLock",
        useInModel: true,
        editable: true
    }
});

export default Rectangle;
