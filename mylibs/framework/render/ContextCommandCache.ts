import CrazyScope from "../CrazyManager";
import Point from "../../math/point";
import { IContext, ContextType } from "carbon-core";

enum EntryType {
    method = 1,
    prop = 2
}

interface ICacheMethodEntry {
    type: EntryType.method,
    method: string;
    args?: any;
}

interface ICachePropEntry {
    type: EntryType.prop,
    prop: string;
    value: any;
}

type ICacheEntry = ICacheMethodEntry | ICachePropEntry;

export default class ContextCommandCache implements IContext {
    [name: string]: any;
    type = ContextType.Cache;

    private _commands: ICacheEntry[];
    private _context:any;

    constructor(context) {
        this._context = context;
        this._commands = [];
    }

    get commands() {
        return this._commands;
    }

    static replay(context:IContext, commands: ICacheEntry[]) {
        for(var i = 0; i < commands.length; ++i) {
            var c = commands[i];
            switch(c.type) {
                case EntryType.method:
                    if(c.args) {
                        context[c.method].apply(context, c.args);
                    } else {
                        context[c.method].call(context);
                    }
                    break;

                case EntryType.prop:
                    context[c.prop] = c.value;
                    break;
            }
        }
    }

    beginElement(element: any): boolean {
        return true;
    }
    endElement(element: any): void {
    }

    set relativeOffsetX(value) {
        this._context && (this._context.relativeOffsetX = value);
        this._commands.push({type:EntryType.prop, prop:'relativeOffsetX', value});
    }

    set relativeOffsetY(value) {
        this._context && (this._context.relativeOffsetY = value);
        this._commands.push({type:EntryType.prop, prop:'relativeOffsetY', value});
    }

    resetTransform() {
        this._context && this._context.resetTransform();
        this._commands.push({type:EntryType.method, method:'resetTransform'});
    }

    get contextScale() {
        return this._context.contextScale;
    }

    get width() {
        return this._context.width;
    }

    set width(value) {
        this._context && (this._context.width = value);
        this._commands.push({type:EntryType.prop, prop:'width', value});
    }

    get height() {
        return this._context.height;
    }

    set height(value) {
        this._context && (this._context.height = value);
        this._commands.push({type:EntryType.prop, prop:'height', value});
    }

    get canvas() {
        return this._context.canvas;
    }

    set canvas(value) {
        this._context && (this._context.canvas = value);
    }

    roundedRect(x, y, width, height, radius, fillStyle, strokeStyle, lineWidth) {
        this._context && this._context.roundedRect.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'roundedRect', args:arguments});
    }

    roundedRectPath(x, y, width, height, rx, ry) {
        this._context && this._context.roundedRectPath.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'roundedRectPath', args:arguments});
    }

    roundedRectPathWithPointer(x, y, width, height, rx, ry, side, pd, pw, ph) {
        this._context && this._context.roundedRectPathWithPointer.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'roundedRectPathWithPointer', args:arguments});
    }

    roundedRectDifferentRadiusesPath(x, y, width, height, upperLeft, upperRight, bottomLeft, bottomRight) {
        this._context && this._context.roundedRectDifferentRadiusesPath.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'roundedRectDifferentRadiusesPath', args:arguments});
    }

    ellipse(x, y, w, h) {
        this._context && this._context.ellipse.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'ellipse', args:arguments});
    }

    transformedEllipsePath(x, y, w, h, matrix) {
        this._context && this._context.transformedEllipsePath.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'transformedEllipsePath', args:arguments});
    }

    rectPath(x, y, width, height, crazySupported, reverse) {
        this._context && this._context.rectPath.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'rectPath', args:arguments});
    }

    sideRoundedRectPath(x, y, width, height, leftRadius, rightRadius) {
        this._context && this._context.sideRoundedRectPath.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'sideRoundedRectPath', args:arguments});
    }

    angularArrowButton(x, y, w, h, radius, arrowWidth, arrowDirection, fill, stroke) {
        this._context && this._context.angularArrowButton.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'angularArrowButton', args:arguments});
    }

    circlePath(centerX, centerY, radius) {
        this._context && this._context.circlePath.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'circlePath', args:arguments});
    }

    circle(centerX, centerY, radius) {
        this._context && this._context.circle.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'circle', args:arguments});
    }

    fill2() {
        this._context && this._context.fill2.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'fill2', args:arguments});
    }

    strokeLine(x1, y1, x2, y2, style, width) {
        this._context && this._context.strokeLine.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'strokeLine', args:arguments});
    }

    linePath(x1, y1, x2, y2) {
        this._context && this._context.linePath.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'linePath', args:arguments});
    }

    crazyLine(fromX, fromY, toX, toY, dontMove?) {
        this._context && this._context.crazyLine.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'crazyLine', args:arguments});
    }

    // standard context methods
    get globalAlpha() {
        return this._context.globalAlpha;
    }

    set globalAlpha(value) {
        this._context && (this._context.globalAlpha = value);
        this._commands.push({type:EntryType.prop, prop:'globalAlpha',value});
    }

    get globalCompositeOperation() {
        return this._context.globalCompositeOperation;
    }

    set globalCompositeOperation(value) {
        this._context && (this._context.globalCompositeOperation = value);
        this._commands.push({type:EntryType.prop, prop:'globalCompositeOperation',value});
    }

    get fillStyle() {
        return this._context.fillStyle;
    }

    set fillStyle(value) {
        this._context && (this._context.fillStyle = value);
        this._commands.push({type:EntryType.prop, prop:'fillStyle',value});
    }

    get strokeStyle() {
        return this._context.strokeStyle;
    }

    set strokeStyle(value) {
        this._context && (this._context.strokeStyle = value);
        this._commands.push({type:EntryType.prop, prop:'strokeStyle',value});
    }

    get lineWidth() {
        return this._context.lineWidth;
    }

    set lineWidth(value) {
        this._context && (this._context.lineWidth = value);
        this._commands.push({type:EntryType.prop, prop:'lineWidth',value});
    }

    get imageSmoothingEnabled() {
        return this._context.imageSmoothingEnabled;
    }

    set imageSmoothingEnabled(value) {
        this._context && (this._context.imageSmoothingEnabled = value);
        this._commands.push({type:EntryType.prop, prop:'imageSmoothingEnabled',value});
    }

    get lineCap() {
        return this._context.lineCap;
    }

    set lineCap(value) {
        this._context && (this._context.lineCap = value);
        this._commands.push({type:EntryType.prop, prop:'lineCap',value});
    }

    get lineJoin() {
        return this._context.lineJoin;
    }

    set lineJoin(value) {
        this._context && (this._context.lineJoin = value);
        this._commands.push({type:EntryType.prop, prop:'lineJoin',value});
    }


    get miterLimit() {
        return this._context.miterLimit;
    }

    set miterLimit(value) {
        this._context && (this._context.miterLimit = value);
        this._commands.push({type:EntryType.prop, prop:'miterLimit',value});
    }

    get shadowOffsetX() {
        return this._context.shadowOffsetX;
    }

    set shadowOffsetX(value) {
        this._context && (this._context.shadowOffsetX = value);
        this._commands.push({type:EntryType.prop, prop:'shadowOffsetX',value});
    }

    get shadowOffsetY() {
        return this._context.shadowOffsetY;
    }

    set shadowOffsetY(value) {
        this._context && (this._context.shadowOffsetY = value);
        this._commands.push({type:EntryType.prop, prop:'shadowOffsetY',value});
    }


    get shadowBlur() {
        return this._context.shadowBlur;
    }

    set shadowBlur(value) {
        this._context && (this._context.shadowBlur = value);
        this._commands.push({type:EntryType.prop, prop:'shadowBlur',value});
    }

    get shadowColor() {
        return this._context.shadowColor;
    }

    set shadowColor(value) {
        this._context && (this._context.shadowColor = value);
        this._commands.push({type:EntryType.prop, prop:'shadowColor',value});
    }

    get font() {
        return this._context.font;
    }

    set font(value) {
        this._context && (this._context.font = value);
        this._commands.push({type:EntryType.prop, prop:'font',value});
    }

    get textAlign() {
        return this._context.textAlign;
    }

    set textAlign(value) {
        this._context && (this._context.textAlign = value);
        this._commands.push({type:EntryType.prop, prop:'textAlign',value});
    }

    get textBaseline() {
        return this._context.textBaseline;
    }

    set textBaseline(value) {
        this._context && (this._context.textBaseline = value);
        this._commands.push({type:EntryType.prop, prop:'textBaseline',value});
    }

    get filter() {
        return this._context.filter;
    }

    set filter(value) {
        this._context && (this._context.filter = value);
        this._commands.push({type:EntryType.prop, prop:'filter',value});
    }

    set lineDashOffset(value) {
        this._context && (this._context.lineDashOffset = value);
        this._commands.push({type:EntryType.prop, prop:'lineDashOffset',value});
    }

    get lineDashOffset() {
        return this._context.lineDashOffset;
    }

    save() {
        this._context && this._context.save.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'save', args:arguments});
    }

    restore() {
        this._context && this._context.restore.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'restore', args:arguments});
    }

    scale(x, y) {
        this._context && this._context.scale.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'scale', args:arguments});
    }

    rotate(angle) {
        this._context && this._context.rotate.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'rotate', args:arguments});
    }

    translate(x, y) {
        this._context && this._context.translate.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'translate', args:arguments});
    }

    transform(m11, m12, m21, m22, dx, dy) {
        this._context && this._context.transform.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'transform', args:arguments});
    }

    setTransform(m11, m12, m21, m22, dx, dy) {
        this._context && this._context.setTransform.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'setTransform', args:arguments});
    }

    createLinearGradient(x0, y0, x1, y1) {
        this._context && this._context.createLinearGradient.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'createLinearGradient', args:arguments});
    }

    createRadialGradient(x0, y0, r0, x1, y1, r1) {
        this._context && this._context.createRadialGradient.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'createRadialGradient', args:arguments});
    }

    createPattern(image, repetition) {
        this._context && this._context.createPattern.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'createPattern', args:arguments});
    }

    clearRect(x, y, w, h) {
        this._context && this._context.clearRect.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'clearRect', args:arguments});
    }

    fillRect(x, y, w, h) {
        this._context && this._context.fillRect.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'fillRect', args:arguments});
    }

    strokeRect(x, y, w, h) {
        this._context && this._context.strokeRect.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'strokeRect', args:arguments});
    }

    beginPath() {
        this._context && this._context.beginPath.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'beginPath', args:arguments});
    }

    closePath() {
        this._context && this._context.closePath.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'closePath', args:arguments});
    }

    moveTo(x, y) {
        this._context && this._context.moveTo.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'moveTo', args:arguments});
    }

    lineTo(x, y) {
        this._context && this._context.lineTo.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'lineTo', args:arguments});
    }

    quadraticCurveTo(cpx, cpy, x, y) {
        this._context && this._context.quadraticCurveTo.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'quadraticCurveTo', args:arguments});
    }

    bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
        this._context && this._context.bezierCurveTo.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'bezierCurveTo', args:arguments});
    }

    arcTo(x1, y1, x2, y2, radius) {
        this._context && this._context.arcTo.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'arcTo', args:arguments});
    }

    rect(x, y, w, h) {
        this._context && this._context.rect.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'rect', args:arguments});
    }

    arc(x, y, radius, startAngle, endAngle, anticlockwise) {
        this._context && this._context.arc.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'arc', args:arguments});
    }

    fill(mode?) {
        this._context && this._context.fill.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'fill', args:arguments});
    }

    stroke() {
        this._context && this._context.stroke.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'stroke', args:arguments});
    }

    clip() {
        this._context && this._context.clip.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'clip', args:arguments});
    }

    isPointInPath(x, y) {
        return this._context.isPointInPath.apply(this, arguments);
    }

    drawFocusRing(element, xCaret, yCaret, canDrawCustom) {
        this._context && this._context.drawFocusRing.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'drawFocusRing', args:arguments});
    }

    fillText(text, x, y, maxWidth?) {
        this._context && this._context.fillText.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'fillText', args:arguments});
    }

    strokeText(text, x, y, maxWidth) {
        this._context && this._context.strokeText.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'strokeText', args:arguments});
    }

    measureText(text) {
        return this._context.measureText.apply(this, arguments);
    }

    drawImage(img_elem, dx_or_sx, dy_or_sy, dw_or_sw, dh_or_sh, dx, dy, dw, dh) {
        this._context && this._context.drawImage.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'drawImage', args:arguments});
    }

    createImageData(imagedata_or_sw, sh) {
        this._context && this._context.createImageData.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'createImageData', args:arguments});
    }

    getImageData(sx, sy, sw, sh) {
        this._context && this._context.getImageData.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'getImageData', args:arguments});
    }

    putImageData(image_data, dx, dy, dirtyX, dirtyY, dirtyWidth, dirtyHeight) {
        this._context && this._context.putImageData.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'putImageData', args:arguments});
    }

    setLineDash(pattern) {
        this._context && this._context.setLineDash.apply(this, arguments);
        this._commands.push({type:EntryType.method, method:'setLineDash', args:arguments});
    }
}