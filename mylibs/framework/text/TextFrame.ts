import { TextNode } from "./TextNode";
import Rect from "../../math/rect";
import { TextWrap } from "./TextWrap";
import { TextLine } from "./TextLine";

export class TextFrame extends TextNode {
    _bounds: Rect;
    _actualWidth: any;
    _wrapper: TextWrap;
    _currLength = 0;
    _currHeight = 0;
    lines: TextLine[]  = null;
    wrapper = null;
    _parent = null;
    ordinal = 0;
    height = undefined;
    length = undefined;
    _realBounds = null;
    _topMargin = undefined;
    _bottomMargin = undefined;

    constructor(left, top, width, ordinal, parent, includeTerminator, initialAscent, initialDescent, noWrap) {
        super('frame', parent, left, top)
        this.lines = [];
        this._parent = parent;
        this.ordinal = ordinal;
        this._currLength = 0;
        this._currHeight = 0;
        this._wrapper = new TextWrap(left, top, width, ordinal, this, includeTerminator, initialAscent, initialDescent, noWrap);
    }

    frame(emit, word) {
        if (this._wrapper.wrap(function (line) {
            if (typeof line === 'number') {
                this._currHeight = line;
            } else {
                this._currLength = (line.ordinal + line.length) - this.ordinal;
                this.lines.push(line);
            }
        }.bind(this), word)) {
            this.length = this._currLength;
            this.height = this._currHeight;
            emit(this);
            return true;
        }
    }    
    
    realBounds() {
        if (this._realBounds === null) {
            var minX = Number.MAX_VALUE, minY = Number.MAX_VALUE,
                maxX = -Number.MAX_VALUE, maxY = -Number.MAX_VALUE;

            for (var i = 0; i < this.lines.length; i++) {
                var line = this.lines[i];
                minY = Math.min(minY, line.baseline + line.minY);
                minX = Math.min(minX, line.minX);
                maxY = Math.max(maxY, line.baseline + line.maxY);
                maxX = Math.max(maxX, line.maxX);
            }
            if (minX === Number.MAX_VALUE ||
                minY === Number.MAX_VALUE ||
                maxX === -Number.MAX_VALUE ||
                maxY === -Number.MAX_VALUE) {
                this._realBounds = Rect.Zero;
            } else {
                this._realBounds = new Rect(minX, minY, maxX - minX, maxY - minY);
            }
        }

        return this._realBounds;
    }

    topMargin() {
        if (this._topMargin === undefined) {
            this._topMargin = NaN;
            var currMargin = Number.MAX_VALUE;
            for (var i = 0; i < this.lines.length; i++) {
                var line = this.lines[i];
                var miny = line.minY;

                if (miny !== Number.MAX_VALUE) {
                    var base = line.baseline;
                    currMargin = Math.min(currMargin, base + miny);
                }
            }

            if (currMargin !== Number.MAX_VALUE) {
                this._topMargin = currMargin;
            }
        }

        return this._topMargin;
    }

    bottomMargin() {
        if (this._bottomMargin === undefined) {
            this._bottomMargin = NaN;
            if (this.lines.length) {
                var b = this.bounds();
                var absHeight = b.y + b.height;

                for (var i = this.lines.length - 1; i >= 0; i--) {
                    var line = this.lines[i];
                    var maxy = line.maxY;
                    if (Number.isNaN(maxy)) {
                        console.log()
                    } else
                        if (maxy !== -Number.MAX_VALUE) {
                            this._bottomMargin = absHeight - line.baseline - maxy;
                            break;
                        }
                }
            }
        }

        return this._bottomMargin;
    }

    bounds() {
        if (!this._bounds) {
            var left = 0, top = 0, right = 0, bottom = 0;
            if (this.lines.length) {
                var first = this.lines[0].bounds();
                left = first.x;
                top = first.y;
                this.lines.forEach(function (line) {
                    var b = line.bounds();
                    right = Math.max(right, b.x + b.width);
                    bottom = Math.max(bottom, b.y + b.height);
                });
            }
            this._bounds = new Rect(left, top, right - left, (bottom - top) || this.height);
        }
        return this._bounds;
    }

    actualWidth() {
        if (!this._actualWidth) {
            var result = 0;
            this.lines.forEach(function (line) {
                if (typeof line.actualWidth === 'number') {
                    result = Math.max(result, line.actualWidth);
                }
            });
            this._actualWidth = result;
        }
        return this._actualWidth;
    }
    actualWidthWithoutWrap() {
        let result = 0;
        let lineWidth = 0;
        for (let i = 0; i < this.lines.length; ++i) {
            let line = this.lines[i];

            lineWidth += line.actualWidth;
            if (line.isWrapped()) {
                continue;
            }

            result = Math.max(result, lineWidth);
            lineWidth = 0;
        }
        return result;
    }

    children() {
        return this.lines;
    }

    draw(ctx, viewPort) {
        var top = viewPort ? viewPort.t : 0;
        var bottom = viewPort ? (viewPort.t + viewPort.h) : Number.MAX_VALUE;
        this.lines.some(function (line) {
            var b = line.bounds();
            if (b.y + b.height < top) {
                return false;
            }
            if (b.y > bottom) {
                return true;
            }
            line.draw(ctx, viewPort);
        });
    }    
}    