﻿import Shape from "./Shape";
import * as rectmath from "../math/math";
import QuadAndLock from "./QuadAndLock";
import PropertyMetadata from "./PropertyMetadata";
import Brush from "./Brush";
import Shadow from "./Shadow";
import { PointDirection, Types, FrameCursors } from "./Defs";
import nearestPoint from "../math/NearestPoint";
import commandManager from "./commands/CommandManager";
import Path from "./Path";
import UIElement from "./UIElement";
import Invalidate from "./Invalidate";
import Point from "../math/point";
import { ResizeDimension, ChangeMode, InteractionType, IMouseEventData, RenderEnvironment, StrokePosition } from "carbon-core";
import Rect from "../math/rect";
import TransformationHelper from "./interactions/TransformationHelper";

const PointSize = 4;
const PointOffset = 10;

function getOffsetForPoint(w, h, scale, value) {
    var d = ((!value) ? PointOffset : 0) / scale;
    var rx = (w - d) / 2;
    var ry = (h - d) / 2;

    var maxRadius = Math.min(rx, ry);
    var posPercent = Math.min(value, maxRadius) / maxRadius;
    return { x: d + maxRadius * posPercent, y: d + maxRadius * posPercent };
}

var CornerRadiusPoint = {
    cursorSet: FrameCursors,
    hitTest(frame, mousePoint, pt, elementPoint, scale) {
        return Math.abs(mousePoint.x - pt.x) < PointSize / scale && Math.abs(mousePoint.y - pt.y) < PointSize / scale;
    },

    draw(p, frame, scale, context, matrix) {
        context.fillStyle = '#fff';
        context.strokeStyle = '#22c1ff';
        context.beginPath();
        var pt = matrix.transformPoint2(p.x, p.y, true);
        pt.roundToNearestHalf();
        context.circle(pt.x, pt.y, PointSize);
        context.fill();
        context.stroke();
    },
    capture(frame, point, event: IMouseEventData) {
        frame.originalValue = frame.element.cornerRadius();
        frame.onlyCurrentVisible = true;
        if (frame.element.decorators) {
            frame.element.decorators.forEach(x => x.visible = (false));
        }
        event.controller.raiseInteractionStarted(InteractionType.RadiusChange, event);
    },
    release(frame, point, event: IMouseEventData) {
        if (frame.element) {
            delete frame.onlyCurrentVisible;
            let newRadius = frame.element.cornerRadius();
            frame.element.setProps({ cornerRadius: frame.originalValue }, ChangeMode.Self);
            frame.element.setProps({ cornerRadius: newRadius }, ChangeMode.Model);

            if (frame.element.decorators) {
                frame.element.decorators.forEach(x => x.visible = (true));
            }
            event.controller.raiseInteractionStopped(InteractionType.RadiusChange, event);
        }
    },
    rotateCursorPointer(index, angle) {
        var dc = ~~(((360 - angle + 23) % 360) / 45);
        return (index + dc) % 8;
    },
    update: function (p, x, y, w, h, element, scale) {
        var cornerRadius = element.cornerRadius();
        var value = cornerRadius[p.prop];
        var offset = getOffsetForPoint(w, h, scale, value);

        var rv = p.rv;
        p.x = x + w * rv[0] + rv[1] * offset.x;
        p.y = y + h * rv[2] + rv[3] * offset.y;
    },
    change(frame, dx, dy, point, mousePoint, keys, event:IMouseEventData) {
        if (!frame.element) {
            return;
        }
        var rect = frame.element.boundaryRect();
        var rv = point.rv;
        var w2 = rect.width / 2;
        var h2 = rect.height / 2;

        var mousePosition = frame.element.globalViewMatrixInverted().transformPoint(mousePoint);

        // p1, p2, gives us line equation
        var p1 = { x: rect.width * rv[0], y: rect.height * rv[2] };

        var dw = 0, dh = 0;
        if (w2 > h2) {
            dw = h2 - w2;
        } else {
            dh = w2 - h2;
        }

        var p2 = { x: w2 + dw * rv[1], y: h2 + dh * rv[3] };
        var pr: any = {};
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
        var newRadius = 0 | parameter * maxRadius;

        var r = clone(frame.element.cornerRadius());
        r.locked = !keys.altKey;

        if (!r.locked) {
            r[point.prop] = newRadius;
        } else {
            r.upperLeft = newRadius;
            r.upperRight = newRadius;
            r.bottomLeft = newRadius;
            r.bottomRight = newRadius;
        }
        frame.element.setProps({ cornerRadius: r }, ChangeMode.Self);
        Invalidate.requestInteractionOnly();

        event.controller.raiseInteractionProgress(InteractionType.RadiusChange, mousePoint);
    }
}

class Rectangle extends Shape {
    constructor() {
        super();
    }

    canConvertToPath() {
        return true;
    }

    convertToPath(): Path {
        var br = this.boundaryRect();
        var path = new Path()
            , x1 = 0
            , y1 = 0
            , x2 = br.width
            , y2 = br.height
            , cr = this.cornerRadius();
        path.setProps({ pointRounding: 0 });

        var mr = Math.min(br.width / 2, br.height / 2);

        if (cr.upperLeft === 0) {
            path.addPoint({ x: x1, y: y1 });
        } else {
            var r = Math.min(mr, cr.upperLeft);
            path.addPoint({ x: x1, y: y1 + r, cp2x: x1, cp2y: y1 + 0.45 * r });
            path.addPoint({ x: x1 + r, y: y1, cp1x: x1 + 0.45 * r, cp1y: y1 });
        }
        if (cr.upperRight === 0) {
            path.addPoint({ x: x2, y: y1 });
        } else {
            r = Math.min(mr, cr.upperRight);
            path.addPoint({ x: x2 - r, y: y1, cp2x: x2 - 0.45 * r, cp2y: y1 });
            path.addPoint({ x: x2, y: y1 + r, cp1x: x2, cp1y: y1 + 0.45 * r });
        }
        if (cr.bottomRight === 0) {
            path.addPoint({ x: x2, y: y2 });
        } else {
            r = Math.min(mr, cr.bottomRight);
            path.addPoint({ x: x2, y: y2 - r, cp2x: x2, cp2y: y2 - 0.45 * r });
            path.addPoint({ x: x2 - r, y: y2, cp1x: x2 - 0.45 * r, cp1y: y2 });
        }
        if (cr.bottomLeft === 0) {
            path.addPoint({ x: x1, y: y2 });
        } else {
            r = Math.min(mr, cr.bottomLeft);
            path.addPoint({ x: x1 + r, y: y2, cp2x: x1 + 0.45 * r, cp2y: y2 });
            path.addPoint({ x: x1, y: y2 - r, cp1x: x1, cp1y: y2 - 0.45 * r });
        }
        path.closed(true);
        path.setProps({
            shadows: this.props.shadows,
            fill: this.fill,
            stroke: this.stroke,
            styleId: this.styleId(),
            strokeWidth: this.strokeWidth(),
            name: this.name
        });

        path.setTransform(this.viewMatrix());
        path.adjustBoundaries();

        return path;
    }

    cornerRadius(value?) {
        if (value !== undefined) {
            this.setProps({ cornerRadius: value })
        }
        return this.props.cornerRadius;
    }

    hitTest(/*Point*/point, view) {
        if (!this.visible || this.hasBadTransform()) {
            return false;
        }
        var fill = this.fill;
        var stroke = this.stroke;

        if (fill && fill.type) {
            return Shape.prototype.hitTest.apply(this, arguments);
        }

        var rect = this.getHitTestBox(view, false, false);
        var outerRect, innerRect;

        var matrix = this.globalViewMatrixInverted();
        point = matrix.transformPoint(point);

        var strokePosition = this.strokePosition()
        var strokeWidth = this.strokeWidth();
        if (strokePosition === StrokePosition.Center) {
            outerRect = rectmath.adjustRectSize(rect, strokeWidth / 2 + 1);
            innerRect = rectmath.adjustRectSize(rect, -(strokeWidth / 2 + 1));
        }
        else if (strokePosition === StrokePosition.Inside) {
            outerRect = rectmath.adjustRectSize(rect, 1);
            innerRect = rectmath.adjustRectSize(rect, -(strokeWidth + 1));
        }
        else {
            outerRect = rectmath.adjustRectSize(rect, strokeWidth + 1);
            innerRect = rectmath.adjustRectSize(rect, -1);
        }
        return rectmath.isPointInRect(outerRect, point) && !rectmath.isPointInRect(innerRect, point);
    }
    drawPath(context, w, h) {
        var cornerRadius = this.cornerRadius();

        var r1 = cornerRadius.upperLeft;

        if (!cornerRadius.locked || r1) {
            var mr = Math.min(w / 2, h / 2);
            var r2 = cornerRadius.locked ? r1 : cornerRadius.upperRight,
                r3 = cornerRadius.locked ? r1 : cornerRadius.bottomLeft,
                r4 = cornerRadius.locked ? r1 : cornerRadius.bottomRight;
            context.roundedRectDifferentRadiusesPath(0, 0, w, h,
                Math.min(mr, r1),
                Math.min(mr, r2),
                Math.min(mr, r3),
                Math.min(mr, r4));
        } else {
            context.rectPath(0, 0, w, h);
        }
    }

    createSelectionFrame(view) {
        var frame = super.createSelectionFrame(view);

        if (view.prototyping()) {
            return frame;
        }

        if (this.resizeDimensions() === ResizeDimension.None) {
            return frame;
        }

        if (!this.selectFrameVisible()) {
            return frame;
        }

        frame.points.push({
            type: CornerRadiusPoint,
            moveDirection: PointDirection.Any,
            x: 0,
            y: 0,
            cursor: 3,
            rv: [0, 1, 0, 1],
            prop: 'upperLeft',
            visible: function (p, frame, w, h, scale) {
                return (w * scale > 50 && h * scale > 50);
            }
        });

        frame.points.push({
            type: CornerRadiusPoint,
            moveDirection: PointDirection.Any,
            x: 0,
            y: 0,
            cursor: 5,
            rv: [1, -1, 0, 1],
            prop: 'upperRight',
            visible: function (p, frame, w, h, scale) {
                return (w * scale > 50 && h * scale > 50);
            }
        });

        frame.points.push({
            type: CornerRadiusPoint,
            moveDirection: PointDirection.Any,
            x: 0,
            y: 0,
            cursor: 7,
            rv: [1, -1, 1, -1],
            prop: 'bottomRight',
            visible: function (p, frame, w, h, scale) {
                return (w * scale > 50 && h * scale > 50);
            }
        });

        frame.points.push({
            type: CornerRadiusPoint,
            moveDirection: PointDirection.Any,
            x: 0,
            y: 0,
            cursor: 1,
            rv: [0, 1, 1, -1],
            prop: 'bottomLeft',
            visible: function (p, frame, w, h, scale) {
                return (w * scale > 50 && h * scale > 50);
            }
        });

        return frame;
    }

    static fromSvgElement = function (element, parsedAttributes, matrix?) {
        // var parsedAttributes = svgParser.parseAttributes(element, Rectangle.ATTRIBUTE_NAMES);
        var rect = new Rectangle();

        App.Current.activePage.nameProvider.assignNewName(rect);
        if (parsedAttributes.width || parsedAttributes.height) {
            rect.setProps({ br: new Rect(0, 0, parsedAttributes.width || 1, parsedAttributes.height || 1) })
        }

        if (parsedAttributes.id) {
            rect.name = (parsedAttributes.id);
        }

        rect.setProps({ pointRounding: 0 });

        if (parsedAttributes.rx !== undefined && parsedAttributes.rx === parsedAttributes.ry) {
            var r = parseFloat(parsedAttributes.rx);
            rect.cornerRadius({
                bottomLeft: r,
                bottomRight: r,
                upperLeft: r,
                upperRight: r,
                locked: true
            });
        }

        if (parsedAttributes.fill !== undefined) {
            if (!parsedAttributes.fill || parsedAttributes.fill === "none") {
                rect.fill = (Brush.Empty);
            } else {
                rect.fill = (Brush.createFromCssColor(parsedAttributes.fill));
            }
        }

        if (parsedAttributes.stroke) {
            rect.stroke = (Brush.createFromCssColor(parsedAttributes.stroke));
        } else {
            rect.stroke = (Brush.Empty);
        }

        if (parsedAttributes.opacity) {
            rect.opacity = (parsedAttributes.opacity);
        }

        var pos = new Point(0, 0);
        if (parsedAttributes.x) {
            pos.x = parsedAttributes.x;
        }
        if (parsedAttributes.y) {
            pos.y = parsedAttributes.y;
        }

        rect.applyTranslation(pos);

        var path = rect.convertToPath();
        path.applyTransform(matrix, true);
        return path;
    }
}
Rectangle.prototype.t = Types.Rectangle;

PropertyMetadata.registerForType(Rectangle, {
    cornerRadius: {
        displayName: "@cornerRadius",
        defaultValue: QuadAndLock.Default,
        type: "corners"
    },
    groups: function () {
        var baseGroups = PropertyMetadata.findAll(Types.Shape).groups();

        return [
            baseGroups.find(x => x.id === "layout"),
            baseGroups.find(x => x.label === "@constraints"),
            {
                label: "Appearance",
                properties: ["opacity", "cornerRadius", "fill", "stroke"]
            },
            baseGroups.find(x => x.label === "@shadow"),
            baseGroups.find(x => x.label === "@advanced")
        ];
    }
});

export default Rectangle;
