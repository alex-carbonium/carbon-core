import Shape from "framework/Shape";
import Brush from "framework/Brush";
import PropertyMetadata from "framework/PropertyMetadata";
import Path from "ui/common/Path";
import * as math from "math/math";
import {Types, StrokePosition} from "./Defs";

class Circle extends Shape {
    hitTest (/*Point*/point, scale) {
        if (!this.visible()) {
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

        var stroke = this.stroke();
        if (stroke.position === 0) {
            outerRect = math.adjustRectSize(rect, stroke.lineWidth / 2 + 1);
            innerRect = math.adjustRectSize(rect, -(stroke.lineWidth / 2 + 1));
        } else if (stroke.position === 1) {
            outerRect = math.adjustRectSize(rect, 1);
            innerRect = math.adjustRectSize(rect, -(stroke.lineWidth + 1));
        } else {
            outerRect = math.adjustRectSize(rect, stroke.lineWidth + 1);
            innerRect = math.adjustRectSize(rect, -1);
        }

        return math.isPointInEllipse(outerRect, point) && !math.isPointInEllipse(innerRect, point);
    }

    resize (/*Rect*/rect, ignoreSnapping, options) {
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
    
    iconType () {
        return 'circle';
    }
    
    convertToPath () {
        var path = new Path()
            , x1 = this.x()
            , y1 = this.y()
            , w = this.width()
            , h = this.height()
            , w2 = w / 2
            , h2 = h / 2;
        var dx = 0.55 * w / 2;
        var dy = 0.55 * h / 2;

        path.addPoint({x: x1 + w2, y: y1, type: 2, cp1x: (x1 + w2 - dx), cp1y: y1, cp2x: (x1 + w2 + dx), cp2y: y1});
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
        path.addPoint({x: x1, y: y1 + h2, type: 2, cp2x: x1, cp2y: y1 + h2 - dy, cp1x: x1, cp1y: y1 + h2 + dy});
        path.closed(true);
        // path.strokeWidth(this.strokeWidth());
        path.fill(this.fill());
        path.stroke(this.stroke());
        path.styleId(this.styleId());
        path.name(this.name());

        path.adjustBoundaries();
        path.x(this.x());
        path.y(this.y());
        path.angle(this.angle());

        return path;
    }


    drawPath (context, w, h) {
        context.ellipse(0, 0, w, h);
    }

    drawSelf (context, w, h, environment) {
//                var that = this;
//                var shadow = this.shadow();
//
//                shadow.apply(context, function(context){
//                    that.drawShape(context, x, y, w, h);
//                });

        context.save();

        var dashPattern = this.props.dashPattern;
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
}
Circle.prototype.t = Types.Circle;

PropertyMetadata.registerForType(Circle, {
});


var ATTRIBUTE_NAMES = 'x y width height r rx ry cx cy transform fill stroke stroke-width'.split(' ');
Circle.fromSvgElement = function (element, options) {
    var parsedAttributes = sketch.svg.parseAttributes(element, ATTRIBUTE_NAMES);
    var circle = new Circle();
    if (parsedAttributes.rx) {
        circle.width(parsedAttributes.rx * 2);
    }
    if (parsedAttributes.ry) {
        circle.height(parsedAttributes.ry * 2);
    }

    if (parsedAttributes.radius) {
        circle.width(circle.height(parsedAttributes.radius * 2));
    }

    if (parsedAttributes.fill) {
        circle.fillBrush(Brush.createFromColor(parsedAttributes.fill));
    }
    if (parsedAttributes.stroke) {
        circle.strokeBrush(Brush.createFromColor(parsedAttributes.stroke));
    }
    if (parsedAttributes.left) {
        circle.x(parsedAttributes.left);
    }
    if (parsedAttributes.top) {
        circle.y(parsedAttributes.top);
    }
    return circle;
};

export default Circle;
