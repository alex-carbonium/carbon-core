import CrazyScope from "framework/CrazyManager";

export default class ContextStub {

    constructor() {
    }

    set relativeOffsetX(value){
        this._relativeOffsetX = value;
    }

    set relativeOffsetY(value){
        this._relativeOffsetY = value;
    }

    resetTransform(){
    }

    get width() {
        return this._width;
    }

    set width(value) {
        this._width  = value;
    }

    get height() {
        return this._height;
    }

    set height(value) {
        this._height  = value;
    }

    get canvas() {
        return null;
    }

    set canvas(value) {
    }

    roundedRect(x, y, width, height, radius, fillStyle, strokeStyle, lineWidth) {

    }

    roundedRectPath(x, y, width, height, rx, ry) {

    }

    roundedRectPathWithPointer(x, y, width, height, rx, ry, side, pd, pw, ph) {

    }

    roundedRectDifferentRadiusesPath(x, y, width, height, upperLeft, upperRight, bottomLeft, bottomRight) {

    }

    ellipse(x, y, w, h) {

    }

    rectPath(x, y, width, height, crazySupported, reverse) {

    }

    sideRoundedRectPath(x, y, width, height, leftRadius, rightRadius) {

    }

    angularArrowButton(x, y, w, h, radius, arrowWidth, arrowDirection, fill, stroke) {

    }

    circlePath(centerX, centerY, radius) {
    }

    circle(centerX, centerY, radius) {
    }

    fill2() {
    }

    strokeLine(x1, y1, x2, y2, style, width) {
    }

    linePath(x1, y1, x2, y2) {

    }

    crazyLine(fromX, fromY, toX, toY, dontMove) {

    }


    // standard context methods
    get globalAlpha() {
    }

    set globalAlpha(value) {
    }

    get globalCompositeOperation() {
    }

    set globalCompositeOperation(value) {
    }

    get fillStyle() {
    }

    set fillStyle(value) {
    }

    get strokeStyle() {
    }

    set strokeStyle(value) {
    }

    get lineWidth() {
    }

    set lineWidth(value) {
    }
    get imageSmoothingEnabled() {
    }

    set imageSmoothingEnabled(value) {
    }

    get lineCap() {
    }

    set lineCap(value) {
    }

    get lineJoin() {
    }

    set lineJoin(value) {
    }


    get miterLimit() {
    }

    set miterLimit(value) {
    }

    get shadowOffsetX() {
    }

    set shadowOffsetX(value) {
    }

    get shadowOffsetY() {
    }

    set shadowOffsetY(value) {
    }

    get shadowBlur() {
    }

    set shadowBlur(value) {
    }

    get shadowColor() {
    }

    set shadowColor(value) {
    }

    get font() {
    }

    set font(value) {
    }

    get textAlign() {
    }

    set textAlign(value) {
    }

    get textBaseline() {
    }

    set textBaseline(value) {
    }

    save() {
    }

    restore() {
    }

    scale(x, y) {
    }

    rotate(angle) {
    }

    translate(x, y) {
    }

    transform(m11, m12, m21, m22, dx, dy) {
    }

    setTransform(m11, m12, m21, m22, dx, dy) {
    }

    createLinearGradient(x0, y0, x1, y1) {
    }

    createRadialGradient(x0, y0, r0, x1, y1, r1) {
    }

    createPattern(image, repetition) {
    }

    clearRect(x, y, w, h) {
    }

    fillRect(x, y, w, h) {
    }

    strokeRect(x, y, w, h) {
    }

    beginPath() {
    }

    closePath() {
    }

    moveTo(x, y) {
    }

    lineTo(x, y) {
    }

    quadraticCurveTo(cpx, cpy, x, y) {
    }

    bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
    }

    arcTo(x1, y1, x2, y2, radius) {
    }

    rect(rect) {
    }

    arc(x, y, radius, startAngle, endAngle, anticlockwise) {
    }

    fill() {
    }

    stroke() {
    }

    clip() {
    }

    isPointInPath(x, y) {
    }

    drawFocusRing(element, xCaret, yCaret, canDrawCustom) {
    }

    fillText(text, x, y, maxWidth) {
    }

    strokeText(text, x, y, maxWidth) {
    }

    measureText(text) {
    }

    drawImage(img_elem, dx_or_sx, dy_or_sy, dw_or_sw, dh_or_sh, dx, dy, dw, dh) {
    }

    createImageData(imagedata_or_sw, sh) {
    }

    getImageData(sx, sy, sw, sh) {
    }

    putImageData(image_data, dx, dy, dirtyX, dirtyY, dirtyWidth, dirtyHeight) {
    }
    
    setLineDash(pattern){
    }

}