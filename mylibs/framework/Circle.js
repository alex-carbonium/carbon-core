import Shape from "framework/Shape";
import Brush from "framework/Brush";
import PropertyMetadata from "framework/PropertyMetadata";
import Path from "framework/Path";
import * as math from "math/math";
import {Types, StrokePosition} from "./Defs";

class Circle extends Shape {
    hitTest(/*Point*/point, scale) {
        if (!this.visible() || this.hasBadTransform()) {
            return false;
        }

        var matrix = this.globalViewMatrixInverted();
        point = matrix.transformPoint(point);

        if (this.fill() && this.fill().type) {
            let rect = this.getHitTestBox(scale);
            return math.isPointInEllipse(rect, point);
        }

        let rect = this.getHitTestBox(scale, false, false);

        var innerRect, outerRect;

        var strokePosition = this.strokePosition()
        var strokeWidth = this.strokeWidth();
        if (strokePosition === StrokePosition.Center) {
            outerRect = math.adjustRectSize(rect, strokeWidth / 2 + 1);
            innerRect = math.adjustRectSize(rect, -(strokeWidth / 2 + 1));
        }
        else if (strokePosition === StrokePosition.Inside) {
            outerRect = math.adjustRectSize(rect, 1);
            innerRect = math.adjustRectSize(rect, -(strokeWidth + 1));
        }
        else {
            outerRect = math.adjustRectSize(rect, strokeWidth + 1);
            innerRect = math.adjustRectSize(rect, -1);
        }

        return math.isPointInEllipse(outerRect, point) && !math.isPointInEllipse(innerRect, point);
    }

    resize(/*Rect*/rect, ignoreSnapping, options) {
        options = options || {};
        if (options.shiftPressed) {
            var startX = rect.x - rect.width;
            var startY = rect.y - rect.height;
            var z = rect.y - startY;
            var x = startX + z;
            rect.x = x;
        }
        Shape.prototype.resize.call(this, rect, ignoreSnapping, options.shiftPressed);
    }

    canConvertToPath() {
        return true;
    }

    convertToPath() {
        var br = this.boundaryRect();
        var path = new Path()
            , x1 = 0
            , y1 = 0
            , w = br.width
            , h = br.height
            , w2 = w / 2
            , h2 = h / 2;
        var dx = 0.55 * w / 2;
        var dy = 0.55 * h / 2;
        path.setProps({pointRounding: 0});

        path.addPoint({
            x: x1 + w2,
            y: y1,
            type: 2,
            cp1x: (x1 + w2 - dx),
            cp1y: y1,
            cp2x: (x1 + w2 + dx),
            cp2y: y1
        });
        path.addPoint({
            x: x1 + w,
            y: y1 + h2,
            type: 2,
            cp1x: (x1 + w),
            cp1y: y1 + h2 - dy,
            cp2x: (x1 + w),
            cp2y: y1 + h2 + dy
        });
        path.addPoint({
            x: x1 + w2,
            y: y1 + h,
            type: 2,
            cp2x: (x1 + w2 - dx),
            cp2y: y1 + h,
            cp1x: (x1 + w2 + dx),
            cp1y: y1 + h
        });
        path.addPoint({
            x: x1,
            y: y1 + h2,
            type: 2,
            cp2x: x1,
            cp2y: y1 + h2 - dy,
            cp1x: x1,
            cp1y: y1 + h2 + dy
        });

        path.closed(true);
        path.fill(this.fill());
        path.stroke(this.stroke());
        path.styleId(this.styleId());
        path.name(this.name());

        path.setTransform(this.viewMatrix());
        path.adjustBoundaries();

        return path;
    }


    drawPath(context, w, h) {
        context.ellipse(0, 0, w, h);
    }

    drawSelf(context, w, h, environment) {
        this.drawOutsetShadows(context, w, h, environment);

        context.save();

        var dashPattern = this.dashPattern();
        if (dashPattern) {
            context.setLineDash(dashPattern);
        }

        this.drawPath(context, w, h);
        var stroke = this.stroke();

        if (w < 2 || h < 2) {
            // if the shape is too small we should not use fill brush, since borders are overlap anyway
            Brush.fill(stroke, context, 0, 0, w, h);
        } else {
            Brush.fill(this.fill(), context, 0, 0, w, h);
        }
        this.drawInsetShadows(context, w, h, environment);

        var strokePosition = this.strokePosition();
        var lw = this.strokeWidth();
        context.lineWidth = lw;
        if (!stroke || !stroke.type || strokePosition === StrokePosition.Center) {
            Brush.stroke(stroke, context, 0, 0, w, h);
        }
        else {
            context.beginPath();
            var db = lw / 2;
            if (strokePosition === StrokePosition.Outside) {
                lw = -lw;
                db = -db;
            }
            context.translate(db, db);
            this.drawPath(context, w - lw, h - lw);
            Brush.stroke(stroke, context, 0, 0, w - lw, h - lw);
        }

        context.restore();
    }
}
Circle.prototype.t = Types.Circle;

PropertyMetadata.registerForType(Circle, {});


Circle.fromSvgElement = function (element, parsedAttributes, matrix) {
    // var parsedAttributes = svgParser.parseAttributes(element, ATTRIBUTE_NAMES);
    var circle = new Circle();
    App.Current.activePage.nameProvider.assignNewName(circle);

    var rx = parsedAttributes.rx || parsedAttributes.r;
    if (rx) {
        circle.width(rx * 2);
    }

    var ry = parsedAttributes.ry || parsedAttributes.r;
    if (ry) {
        circle.height(ry * 2);
    }

    if (parsedAttributes.opacity) {
        circle.opacity(parsedAttributes.opacity);
    }

    circle.setProps({pointRounding: 0});

    if (parsedAttributes.id) {
        circle.name(parsedAttributes.id);
    }

    if (parsedAttributes.fill !== undefined) {
        if (!parsedAttributes.fill || parsedAttributes.fill == "none") {
            circle.fill(Brush.Empty);
        } else {
            circle.fill(Brush.createFromColor(parsedAttributes.fill));
        }
    }

    if (parsedAttributes.stroke) {
        circle.stroke(Brush.createFromColor(parsedAttributes.stroke));
    } else {
        circle.stroke(Brush.Empty);
    }

    if (parsedAttributes.x !== undefined) {
        circle.x(parsedAttributes.x);
    } else if (parsedAttributes.cx !== undefined) {
        circle.x(parsedAttributes.cx - rx);
    }
    if (parsedAttributes.y !== undefined) {
        circle.y(parsedAttributes.y);
    } else if (parsedAttributes.cy !== undefined) {
        circle.y(parsedAttributes.cy - ry);
    }
    var path = circle.convertToPath();
    path.transform(matrix);
    return path;
};

export default Circle;
