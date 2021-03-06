﻿import Shape from "./Shape";
import Brush from "./Brush";
import PropertyMetadata from "./PropertyMetadata";
import Path from "./Path";
import * as math from "../math/math";
import Rect from "../math/rect";
import { Types } from "./Defs";
import { RenderEnvironment, StrokePosition } from "carbon-core";

class Circle extends Shape {
    hitTest(/*Point*/point, view) {
        if (!this.visible || this.hasBadTransform()) {
            return false;
        }

        var matrix = this.globalViewMatrixInverted();
        point = matrix.transformPoint(point);

        if (this.fill && this.fill.type) {
            let rect = this.getHitTestBox(view);
            return math.isPointInEllipse(rect, point);
        }

        let rect = this.getHitTestBox(view, false, false);

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

    resize(/*Rect*/rect, ignoreSnapping?, options?) {
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
        path.setProps({ pointRounding: 0 });

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

    drawPath(context, w, h) {
        context.ellipse(0, 0, w, h);
    }

    drawSelf(context, w, h, environment: RenderEnvironment) {
        this.drawOutsetShadows(context, w, h, environment);

        context.save();

        var dashPattern = this.dashPattern();
        if (dashPattern) {
            context.setLineDash(dashPattern);
        }

        context.beginPath();
        this.drawPath(context, w, h);
        var stroke = this.stroke;

        if (w < 2 || h < 2) {
            // if the shape is too small we should not use fill brush, since borders are overlap anyway
            Brush.fill(stroke, context, 0, 0, w, h);
        } else {
            Brush.fill(this.fill, context, 0, 0, w, h);
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

    static fromSvgElement(element, parsedAttributes, matrix?) {
        // var parsedAttributes = svgParser.parseAttributes(element, ATTRIBUTE_NAMES);
        let circle = new Circle();
        App.Current.activePage.nameProvider.assignNewName(circle);

        let rx = parsedAttributes.rx || parsedAttributes.r;
        let ry = parsedAttributes.ry || parsedAttributes.r;
        if (rx || ry) {
            circle.setProps({ br: new Rect(0, 0, rx * 2 || 1, ry * 2 || 1) })
        }

        if (parsedAttributes.opacity) {
            circle.opacity = (parsedAttributes.opacity);
        }

        circle.setProps({ pointRounding: 0 });

        if (parsedAttributes.id) {
            circle.name = (parsedAttributes.id);
        }

        if (parsedAttributes.fill !== undefined) {
            if (!parsedAttributes.fill || parsedAttributes.fill === "none") {
                circle.fill = (Brush.Empty);
            } else {
                circle.fill = (Brush.createFromCssColor(parsedAttributes.fill));
            }
        }

        if (parsedAttributes.stroke) {
            circle.stroke = (Brush.createFromCssColor(parsedAttributes.stroke));
        } else {
            circle.stroke = (Brush.Empty);
        }

        var pos = { x: 0, y: 0 }
        if (parsedAttributes.x !== undefined) {
            pos.x = parsedAttributes.x;
        } else if (parsedAttributes.cx !== undefined) {
            pos.x = parsedAttributes.cx - rx;
        }
        if (parsedAttributes.y !== undefined) {
            pos.y = parsedAttributes.y;
        } else if (parsedAttributes.cy !== undefined) {
            pos.y = parsedAttributes.cy - ry;
        }
        circle.applyTranslation(pos);
        var path = circle.convertToPath();
        path.transform(matrix);
        return path;
    }
}
Circle.prototype.t = Types.Circle;

PropertyMetadata.registerForType(Circle, {});




export default Circle;
