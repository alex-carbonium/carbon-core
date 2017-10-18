import CrazyScope from "../CrazyManager";
import Point from "../../math/point";
import { IContext, LayerType, ContextType, RenderEnvironment } from "carbon-core";
import Matrix from "math/matrix";

export default class Context implements IContext {
    [name: string]: any;

    constructor(public type: ContextType, canvas?) {
        if (!canvas) {
            canvas = document.createElement("canvas");
        }

        this._canvas = canvas;
        this._context = canvas.getContext("2d");
        this._width = canvas.width;
        this._height = canvas.height;
        this._saveCount = 0;
        this._currentMatrix = Matrix.Identity;
        this._matrixStack = [];
    }

    set relativeOffsetX(value) {
        this._relativeOffsetX = value;
    }

    set relativeOffsetY(value) {
        this._relativeOffsetY = value;
    }

    beginElement(element, environment: RenderEnvironment) {
        return true;
    }

    endElement(element) {

    }

    done() {

    }

    resetTransform() {
        this._currentMatrix = new Matrix(1, 0, 0, 1, this._relativeOffsetX || 0, this._relativeOffsetY || 0);
        this._context.setTransform(1, 0, 0, 1, this._relativeOffsetX || 0, this._relativeOffsetY || 0);
    }

    get contextScale() {
        var devicePixelRatio = window.devicePixelRatio || 1;
        var backingStoreRatio = this._context.backingStorePixelRatio
            || this._context.webkitBackingStorePixelRatio
            || this._context.mozBackingStorePixelRatio
            || this._context.msBackingStorePixelRatio
            || this._context.oBackingStorePixelRatio || 1;

        // on some machines it is non integer, it affects rendering
        // browser zoom is also changing this value, so need to make sure it is never 0
        return Math.max(1, Math.round(devicePixelRatio / backingStoreRatio));
    }

    get width() {
        return this._width;
    }

    set width(value) {
        this._width = this._canvas.width = value;
    }

    get height() {
        return this._height;
    }

    set height(value) {
        this._height = this._canvas.height = value;
    }

    get canvas() {
        return this._canvas;
    }

    set canvas(value) {
        this._canvas = value;
    }

    roundedRect(x, y, width, height, radius, fillStyle, strokeStyle, lineWidth) {
        if (typeof radius === "undefined") {
            radius = 0;
        }

        this.save();

        var crazy = CrazyScope.isCrazy;

        if (fillStyle) {
            this.fillStyle = fillStyle;
        }
        if (strokeStyle) {
            this.strokeStyle = strokeStyle;
            this.lineWidth = lineWidth || 2;
        }

        this.beginPath();
        if (crazy) {
            this.crazyLine(x + radius, y, x + width - radius, y);
        } else {
            this.moveTo(x + radius, y);
            this.lineTo(x + width - radius, y);
        }
        this.quadraticCurveTo(x + width, y, x + width, y + radius);
        if (crazy) {
            this.crazyLine(x + width, y + radius, x + width, y + height - radius, true);
        } else {
            this.lineTo(x + width, y + height - radius);
        }
        this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        if (crazy) {
            this.crazyLine(x + width - radius, y + height, x + radius, y + height, true);
        } else {
            this.lineTo(x + radius, y + height);
        }
        this.quadraticCurveTo(x, y + height, x, y + height - radius);
        if (crazy) {
            this.crazyLine(x, y + height - radius, x, y + radius, true);
        } else {
            this.lineTo(x, y + radius);
        }
        this.quadraticCurveTo(x, y, x + radius, y);
        this.closePath();

        if (strokeStyle !== undefined) {
            this.stroke();
        }
        if (fillStyle !== undefined) {
            this.fill();
        }

        this.restore();
    }

    roundedRectPath(x, y, width, height, rx, ry) {
        this.beginPath();

        var crazy = CrazyScope.isCrazy;

        if (crazy) {
            this.crazyLine(x + rx, y, x + width - rx, y);
        } else {
            this.moveTo(x + rx, y);
            this.lineTo(x + width - rx, y);
        }
        this.quadraticCurveTo(x + width, y, x + width, y + ry);
        if (crazy) {
            this.crazyLine(x + width, y + ry, x + width, y + height - ry, true);
        } else {
            this.lineTo(x + width, y + height - ry);
        }
        this.quadraticCurveTo(x + width, y + height, x + width - rx, y + height);
        if (crazy) {
            this.crazyLine(x + width - rx, y + height, x + rx, y + height, true);
        } else {
            this.lineTo(x + rx, y + height);
        }
        this.quadraticCurveTo(x, y + height, x, y + height - ry);
        if (crazy) {
            this.crazyLine(x, y + height - ry, x, y + ry, true);
        } else {
            this.lineTo(x, y + ry);
        }
        this.quadraticCurveTo(x, y, x + rx, y);
        this.closePath();
    }

    roundedRectPathWithPointer(x, y, width, height, rx, ry, side, pd, pw, ph) {
        this.beginPath();

        var crazy = CrazyScope.isCrazy;

        //y = 0
        if (crazy) {
            if (side === 0) {
                this.crazyLine(x + rx, y, x + pd - pw / 2, y);
                this.crazyLine(x + pd - pw / 2, y, x + pd, y - ph, true);
                this.crazyLine(x + pd, y - ph, x + pd + pw / 2, y, true);
                this.crazyLine(x + pd + pw / 2, y, x + width - rx, y, true);
            } else {
                this.crazyLine(x + rx, y, x + width - rx, y);
            }
        } else {
            this.moveTo(x + rx, y);
            this.lineTo(x + width - rx, y);
        }
        this.quadraticCurveTo(x + width, y, x + width, y + ry);
        //right = 1
        if (crazy) {
            if (side === 1) {
                this.crazyLine(x + width, y + ry, x + width, y + pd - pw / 2, true);
                this.crazyLine(x + width, y + pd - pw / 2, x + width + ph, y + pd, true);
                this.crazyLine(x + width + ph, y + pd, x + width, y + pd + pw / 2, true);
                this.crazyLine(x + width, y + pd + pw / 2, x + width, y + height - ry, true);
            } else {
                this.crazyLine(x + width, y + ry, x + width, y + height - ry, true);
            }
        } else {
            this.lineTo(x + width, y + height - ry);
        }
        this.quadraticCurveTo(x + width, y + height, x + width - rx, y + height);

        //bottom = 2
        if (crazy) {
            if (side === 2) {
                this.crazyLine(x + width - rx, y + height, x + pd + pw / 2, y + height, true);
                this.crazyLine(x + pd + pw / 2, y + height, x + pd, y + height + ph, true);
                this.crazyLine(x + pd, y + height + ph, x + pd - pw / 2, y + height, true);
                this.crazyLine(x + pd - pw / 2, y + height, x + rx, y + height, true);
            } else {
                this.crazyLine(x + width - rx, y + height, x + rx, y + height, true);
            }
        } else {
            this.lineTo(x + rx, y + height);
        }
        this.quadraticCurveTo(x, y + height, x, y + height - ry);

        // left = 3
        if (crazy) {
            if (side === 3) {
                this.crazyLine(x, y + height - ry, x, y + pd + pw / 2, true);
                this.crazyLine(x, y + pd + pw / 2, x - ph, y + pd, true);
                this.crazyLine(x - ph, y + pd, x, y + pd - pw / 2, true);
                this.crazyLine(x, y + pd - pw / 2, x, y + ry, true);
            } else {
                this.crazyLine(x, y + height - ry, x, y + ry, true);
            }
        } else {
            this.lineTo(x, y + ry);
        }
        this.quadraticCurveTo(x, y, x + rx, y);
        this.closePath();
    }

    roundedRectDifferentRadiusesPath(x, y, width, height, upperLeft, upperRight, bottomLeft, bottomRight) {
        const MagicNumber = 0.55228475;

        var crazy = CrazyScope.isCrazy;
        var lastX, lastY;
        var mr;

        lastX = x + width - upperRight;
        lastY = y;
        var startX = x + upperLeft
        if (crazy) {
            this.crazyLine(x + upperLeft, y, lastX, lastY);
        } else {
            this.moveTo(startX, y);
            this.lineTo(lastX, lastY);
        }

        var nextX, nextY;
        var x2 = x + width;
        var y2 = y + height;

        nextX = x2;
        nextY = y + upperRight;
        mr = upperRight * MagicNumber;
        this.bezierCurveTo(lastX + mr, lastY, nextX, nextY - mr, nextX, nextY);

        lastX = x2;
        lastY = y2 - bottomRight;
        if (crazy) {
            this.crazyLine(nextX, nextY, lastX, lastY, true);
        } else {

            this.lineTo(lastX, lastY);
        }

        nextX = x2 - bottomRight;
        nextY = y2;
        mr = bottomRight * MagicNumber;
        this.bezierCurveTo(lastX, lastY + mr, nextX + mr, nextY, nextX, nextY);


        lastX = x + bottomLeft;
        lastY = y2;
        if (crazy) {
            this.crazyLine(nextX, nextY, lastX, lastY, true);
        } else {
            this.lineTo(lastX, lastY);
        }

        nextX = x;
        nextY = y2 - bottomLeft;
        mr = bottomLeft * MagicNumber;
        this.bezierCurveTo(lastX - mr, lastY, nextX, nextY + mr, nextX, nextY);

        lastX = x;
        lastY = y + upperLeft;
        if (crazy) {
            this.crazyLine(nextX, nextY, lastX, lastY, true);
        } else {
            this.lineTo(lastX, lastY);
        }

        nextX = startX;
        nextY = y;
        mr = upperLeft * MagicNumber;
        this.bezierCurveTo(lastX, lastY - mr, nextX - mr, nextY, nextX, nextY);

        this.closePath();
    }

    ellipse(x, y, w, h) {
        var kappa = .5522848,
            ox = (w / 2) * kappa,// control point offset horizontal
            oy = (h / 2) * kappa,// control point offset vertical
            xe = x + w,// x-end
            ye = y + h,// y-end
            xm = x + w / 2,// x-middle
            ym = y + h / 2;       // y-middle

        this.moveTo(x, ym);
        this.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
        this.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
        this.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
        this.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
        this.closePath();
    }

    transformedEllipsePath(x, y, w, h, matrix) {
        var kappa = .5522848,
            ox = (w / 2) * kappa,// control point offset horizontal
            oy = (h / 2) * kappa,// control point offset vertical
            xe = x + w,// x-end
            ye = y + h,// y-end
            xm = x + w / 2,// x-middle
            ym = y + h / 2;       // y-middle

        var p = new Point(0, 0);
        var cp1 = new Point(0, 0);
        var cp2 = new Point(0, 0);

        p.set(x, ym);
        matrix.transformPointMutable(p);
        this.moveTo(p.x, p.y);

        p.set(xm, y);
        cp1.set(x, ym - oy);
        cp2.set(xm - ox, y);
        matrix.transformPointMutable(p);
        matrix.transformPointMutable(cp1);
        matrix.transformPointMutable(cp2);
        this.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y);

        p.set(xe, ym);
        cp1.set(xm + ox, y);
        cp2.set(xe, ym - oy);
        matrix.transformPointMutable(p);
        matrix.transformPointMutable(cp1);
        matrix.transformPointMutable(cp2);
        this.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y);

        p.set(xm, ye);
        cp1.set(xe, ym + oy);
        cp2.set(xm + ox, ye);
        matrix.transformPointMutable(p);
        matrix.transformPointMutable(cp1);
        matrix.transformPointMutable(cp2);
        this.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y);

        p.set(x, ym);
        cp1.set(xm - ox, ye);
        cp2.set(x, ym + oy);
        matrix.transformPointMutable(p);
        matrix.transformPointMutable(cp1);
        matrix.transformPointMutable(cp2);
        this.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y);

        this.closePath();
    }

    rectPath(x, y, width, height, crazySupported, reverse) {
        // this.beginPath();

        var crazy = CrazyScope.isCrazy;
        if (crazy && crazySupported && !reverse) {
            this.crazyLine(x, y, x + width, y);
            this.crazyLine(x + width, y, x + width, y + height, true);
            this.crazyLine(x + width, y + height, x, y + height, true);
            this.crazyLine(x, y + height, x, y, true);
        }
        else {
            if (reverse) {
                this.rect(x + width, y + height, -width, -height);
            } else {
                this.rect(x, y, width, height);
            }
        }
        this.closePath();
    }

    sideRoundedRectPath(x, y, width, height, leftRadius, rightRadius) {
        this.beginPath();

        var crazy = CrazyScope.isCrazy;

        if (crazy) {
            this.crazyLine(x + leftRadius, y, x + width - rightRadius, y);
        } else {
            this.moveTo(x + leftRadius, y);
            this.lineTo(x + width - rightRadius, y);
        }

        if (rightRadius !== 0) {
            this.quadraticCurveTo(x + width, y, x + width, y + rightRadius);
        }

        if (crazy) {
            this.crazyLine(x + width, y + rightRadius, x + width, y + height - rightRadius, true);
        } else {
            this.lineTo(x + width, y + height - rightRadius);
        }
        if (rightRadius !== 0) {
            this.quadraticCurveTo(x + width, y + height, x + width - rightRadius, y + height);
        }

        if (crazy) {
            this.crazyLine(x + width - rightRadius, y + height, x + leftRadius, y + height, true);
        } else {
            this.lineTo(x + leftRadius, y + height);
        }
        if (leftRadius !== 0) {
            this.quadraticCurveTo(x, y + height, x, y + height - leftRadius);
        }

        if (crazy) {
            this.crazyLine(x, y + height - leftRadius, x, y + leftRadius, true);
        } else {
            this.lineTo(x, y + leftRadius);
        }
        if (leftRadius !== 0) {
            this.quadraticCurveTo(x, y, x + leftRadius, y);
        }

        this.closePath();
    }

    angularArrowButton(x, y, w, h, radius, arrowWidth, arrowDirection, fill, stroke) {
        this.save();

        if (fill) {
            this.fillStyle = fill;
        }
        if (stroke) {
            this.strokeStyle = stroke;
            this.lineWidth = 1;
        }

        this.lineJoin = "round";
        this.beginPath();

        var crazy = CrazyScope.isCrazy;

        if (arrowDirection === "right") {
            if (crazy) {
                this.crazyLine(x + radius, y, x + w - arrowWidth, y);
                this.crazyLine(x + w - arrowWidth, y, x + w, y + h / 2, true);
                this.crazyLine(x + w, y + h / 2, x + w - arrowWidth, y + h, true);
            } else {
                this.moveTo(x + radius, y);
                this.lineTo(x + w - arrowWidth, y);
                this.lineTo(x + w, y + h / 2);
                this.lineTo(x + w - arrowWidth, y + h);
            }
        }
        else {
            if (crazy) {
                this.crazyLine(x + arrowWidth, y, x + w - radius, y);
                this.quadraticCurveTo(x + w, y, x + w, y + radius);
                this.crazyLine(x + w, y + radius, x + w, y + h - radius, true);
                this.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
            } else {
                this.moveTo(x + arrowWidth, y);
                this.lineTo(x + w - radius, y);
                this.quadraticCurveTo(x + w, y, x + w, y + radius);
                this.lineTo(x + w, y + h - radius);
                this.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
            }
        }

        if (arrowDirection === "right") {
            if (crazy) {
                this.crazyLine(x + w - arrowWidth, y + h, x + radius, y + h, true);
                this.quadraticCurveTo(x, y + h, x, y + h - radius);
                this.crazyLine(x, y + h - radius, x, y + radius, true);
                this.quadraticCurveTo(x, y, x + radius, y);
            } else {
                this.lineTo(x + radius, y + h);
                this.quadraticCurveTo(x, y + h, x, y + h - radius);
                this.lineTo(x, y + radius);
                this.quadraticCurveTo(x, y, x + radius, y);
            }
        }
        else {
            if (crazy) {
                this.crazyLine(x + w - radius, y + h, x + arrowWidth, y + h, true);
                this.crazyLine(x + arrowWidth, y + h, x, y + h / 2, true);
                this.crazyLine(x, y + h / 2, x + arrowWidth, y, true);
            } else {
                this.lineTo(x + arrowWidth, y + h);
                this.lineTo(x, y + h / 2);
                this.lineTo(x + arrowWidth, y);
            }
        }
        this.closePath();

        if (fill) {
            this.fill();
        }
        if (stroke) {
            this.stroke();
        }

        this.restore();
    }

    circlePath(centerX, centerY, radius) {
        this.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
        this.closePath();
    }

    circle(centerX, centerY, radius) {
        this.beginPath();

        this.circlePath(centerX, centerY, radius);
    }

    fill2() {
        var stroke = this.strokeStyle;
        this.mozFillRule = "evenodd";
        this.fillRule = "evenodd";
        this.fill("evenodd");
    }

    strokeLine(x1, y1, x2, y2, style, width) {
        this.save();

        this.beginPath();
        this.moveTo(x1, y1);
        this.lineTo(x2, y2);

        if (style !== undefined) {
            this.strokeStyle = style;
        }
        if (width !== undefined) {
            this.lineWidth = width;
        }

        this.stroke();
        this.restore();
    }

    linePath(x1, y1, x2, y2) {
        this.beginPath();
        var crazy = CrazyScope.isCrazy;
        if (crazy) {
            this.crazyLine(x1, y1, x2, y2);
        } else {
            this.moveTo(x1, y1);
            this.lineTo(x2, y2);
        }

    }

    crazyLine(fromX, fromY, toX, toY, dontMove?) {
        // The idea is to draw a curve, setting two control points at random
        // close to each side of the line. The longer the line, the sloppier it's drawn.
        var control1x, control1y;
        var control2x, control2y;

        // calculate the length of the line.
        var length = Math.sqrt((toX - fromX) * (toX - fromX) + (toY - fromY) * (toY - fromY));

        // This offset determines how sloppy the line is drawn. It depends on the
        // length, but maxes out at 20.
        var offset = length / CrazyScope.offset;
        if (offset < 3) { offset = length * 0.01; }
        else if (offset > CrazyScope.offset) { offset = CrazyScope.offset; }

        // Overshoot the destination a little, as one might if drawing with a pen.
        //toX += Math.random()*offset/4;
        //toY += Math.random()*offset/4;

        var t1X = fromX, t1Y = fromY;
        var t2X = toX, t2Y = toY;

        // t1 and t2 are coordinates of a line shifted under or to the right of
        // our original.
        t1X += offset;
        t2X += offset;
        t1Y += offset;
        t2Y += offset;

        // create a control point at random along our shifted line.
        var r = Math.random();
        control1x = t1X + r * (t2X - t1X);
        control1y = t1Y + r * (t2Y - t1Y);

        // now make t1 and t2 the coordinates of our line shifted above
        // and to the left of the original.

        t1X = fromX - offset;
        t2X = toX - offset;
        t1Y = fromY - offset;
        t2Y = toY - offset;

        // create a second control point at random along the shifted line.
        r = Math.random();
        control2x = t1X + r * (t2X - t1X);
        control2y = t1Y + r * (t2Y - t1Y);

        // draw the line!
        if (!dontMove) {
            this.moveTo(~~fromX, ~~fromY);
        }
        this.bezierCurveTo(~~control1x, ~~control1y, ~~control2x, ~~control2y, ~~toX, ~~toY);
    }

    get currentMatrix (){
        return this._currentMatrix;
    }

    // standard context methods
    get globalAlpha() {
        return this._context.globalAlpha;
    }

    set globalAlpha(value) {
        this._context.globalAlpha = value;
    }

    get globalCompositeOperation() {
        return this._context.globalCompositeOperation;
    }

    set globalCompositeOperation(value) {
        this._context.globalCompositeOperation = value;
    }

    get fillStyle() {
        return this._context.fillStyle;
    }

    set fillStyle(value) {
        this._context.fillStyle = value;
    }

    get strokeStyle() {
        return this._context.strokeStyle;
    }

    set strokeStyle(value) {
        this._context.strokeStyle = value;
    }


    get lineWidth() {
        return this._context.lineWidth;
    }

    set lineWidth(value) {
        this._context.lineWidth = value;
    }

    get imageSmoothingEnabled() {
        return this._context.imageSmoothingEnabled;
    }

    set imageSmoothingEnabled(value) {
        this._context.imageSmoothingEnabled = value;
    }

    get lineCap() {
        return this._context.lineCap;
    }

    set lineCap(value) {
        this._context.lineCap = value;
    }

    get lineJoin() {
        return this._context.lineJoin;
    }

    set lineJoin(value) {
        this._context.lineJoin = value;
    }


    get miterLimit() {
        return this._context.miterLimit;
    }

    set miterLimit(value) {
        this._context.miterLimit = value;
    }

    get shadowOffsetX() {
        return this._context.shadowOffsetX;
    }

    set shadowOffsetX(value) {
        this._context.shadowOffsetX = value;
    }


    get shadowOffsetY() {
        return this._context.shadowOffsetY;
    }

    set shadowOffsetY(value) {
        this._context.shadowOffsetY = value;
    }


    get shadowBlur() {
        return this._context.shadowBlur;
    }

    set shadowBlur(value) {
        this._context.shadowBlur = value;
    }

    get shadowColor() {
        return this._context.shadowColor;
    }

    set shadowColor(value) {
        this._context.shadowColor = value;
    }

    get font() {
        return this._context.font;
    }

    set font(value) {
        this._context.font = value;
    }

    get textAlign() {
        return this._context.textAlign;
    }

    set textAlign(value) {
        this._context.textAlign = value;
    }

    get textBaseline() {
        return this._context.textBaseline;
    }

    set textBaseline(value) {
        this._context.textBaseline = value;
    }

    get filter() {
        return this._context.filter;
    }

    set filter(value) {
        this._context.filter = value;
    }

    get isBalancedSaveRestore() {
        return this._saveCount === 0;
    }

    get saveCount() {
        return this._saveCount;
    }

    save() {
        this._saveCount++;
        this._matrixStack.push(this._currentMatrix);
        this._context.save.apply(this._context, arguments);
    }

    restore() {
        this._saveCount--;
        this._currentMatrix = this._matrixStack.pop();
        this._context.restore.apply(this._context, arguments);
    }

    scale(x: number, y: number) {
        this._currentMatrix = this._currentMatrix.clone().scale(x, y);
        this._context.scale.apply(this._context, arguments);
    }

    rotate(angle) {
        this._currentMatrix = this._currentMatrix.clone().rotate(angle);
        this._context.rotate.apply(this._context, arguments);
    }

    translate(x, y) {
        this._currentMatrix = this._currentMatrix.clone().translate(x, y);
        this._context.translate.apply(this._context, arguments);
    }

    transform(m11, m12, m21, m22, dx, dy) {
        this._currentMatrix = this._currentMatrix.appended(new Matrix(m11, m12, m21, m22, dx, dy));
        this._context.transform.apply(this._context, arguments);
    }

    setTransform(m11, m12, m21, m22, dx, dy) {
        this._currentMatrix = new Matrix(m11, m12, m21, m22, dx, dy);
        this._context.setTransform.apply(this._context, arguments);
    }

    createLinearGradient(x0, y0, x1, y1) {
        return this._context.createLinearGradient.apply(this._context, arguments);
    }

    createRadialGradient(x0, y0, r0, x1, y1, r1) {
        return this._context.createRadialGradient.apply(this._context, arguments);
    }

    createPattern(image, repetition) {
        return this._context.createPattern.apply(this._context, arguments);
    }

    clear() {
        this.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    clearRect(x, y, w, h) {
        this._context.clearRect.apply(this._context, arguments);
    }

    fillRect(x, y, w, h) {
        this._context.fillRect.apply(this._context, arguments);
    }

    strokeRect(x, y, w, h) {
        this._context.strokeRect.apply(this._context, arguments);
    }

    beginPath() {
        this._context.beginPath.apply(this._context, arguments);
    }

    closePath() {
        this._context.closePath.apply(this._context, arguments);
    }

    moveTo(x, y) {
        this._context.moveTo.apply(this._context, arguments);
    }

    lineTo(x, y) {
        this._context.lineTo.apply(this._context, arguments);
    }

    quadraticCurveTo(cpx, cpy, x, y) {
        this._context.quadraticCurveTo.apply(this._context, arguments);
    }

    bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
        this._context.bezierCurveTo.apply(this._context, arguments);
    }

    arcTo(x1, y1, x2, y2, radius) {
        this._context.arcTo.apply(this._context, arguments);
    }

    rect(x, y, w, h) {
        this._context.rect.apply(this._context, arguments);
    }

    arc(x, y, radius, startAngle, endAngle, anticlockwise) {
        this._context.arc.apply(this._context, arguments);
    }

    fill(mode?) {
        this._context.fill.apply(this._context, arguments);
    }

    stroke() {
        this._context.stroke.apply(this._context, arguments);
    }

    clip() {
        this._context.clip.apply(this._context, arguments);
    }

    isPointInPath(x, y) {
        return this._context.isPointInPath.apply(this._context, arguments);
    }

    drawFocusRing(element, xCaret, yCaret, canDrawCustom) {
        this._context.drawFocusRing.apply(this._context, arguments);
    }

    fillText(text, x, y, maxWidth?) {
        this._context.fillText.apply(this._context, arguments);
    }

    strokeText(text, x, y, maxWidth) {
        this._context.strokeText.apply(this._context, arguments);
    }

    measureText(text) {
        return this._context.measureText.apply(this._context, arguments);
    }

    drawImage(img_elem, dx_or_sx, dy_or_sy, dw_or_sw, dh_or_sh, dx, dy, dw, dh) {
        this._context.drawImage.apply(this._context, arguments);
    }

    createImageData(imagedata_or_sw, sh) {
        this._context.createImageData.apply(this._context, arguments);
    }

    getImageData(sx, sy, sw, sh) {
        return this._context.getImageData.apply(this._context, arguments);
    }

    putImageData(image_data, dx, dy, dirtyX, dirtyY, dirtyWidth, dirtyHeight) {
        return this._context.putImageData.apply(this._context, arguments);
    }

    setLineDash(pattern) {
        this._context.setLineDash.apply(this._context, arguments);
    }

    set lineDashOffset(value) {
        this._context.lineDashOffset = value;
    }
    get lineDashOffset() {
        return this._context.lineDashOffset;
    }

    logToConsole() {
        let data = this._context.canvas.toDataURL("image/png");
        console.log("%c                                                             ",`font-size:128px;display:block;width:240px;height:240px;background-repeat:no-repeat;background-size:contain;background-image:url('${data}');`);
    }
}