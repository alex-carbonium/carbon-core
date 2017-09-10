import Node from "../primitives/node";
import Rect from "../primitives/rect";
import Wrap from "../transform/wrap";
import {inherit} from "../util/util"

    function Frame(left, top, width, ordinal, parent,
                        includeTerminator, initialAscent, initialDescent, noWrap) {
        this.lines = [];
        this._parent = parent;
        this.ordinal = ordinal;
        this._currLength = 0;
        this._currHeight = 0;
        this._wrapper = new Wrap(left, top, width, ordinal, this, includeTerminator, initialAscent, initialDescent, noWrap);
    };

    inherit(Frame, Node);

    Frame.prototype.frame = function(emit, word) {
        if (this._wrapper.wrap(function(line) {
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
    };
    Frame.prototype._currLength = 0;
    Frame.prototype._currHeight = 0;
    Frame.prototype.lines = null;
    Frame.prototype.wrapper = null;
    Frame.prototype._parent = null;
    Frame.prototype.ordinal = 0;
    Frame.prototype.height = undefined;
    Frame.prototype.length = undefined;
    Frame.prototype._realBounds = null;

    Frame.prototype._topMargin = undefined;
    Frame.prototype._bottomMargin = undefined;

    Frame.prototype.realBounds = function () {
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
                this._realBounds = new Rect(0,0,0,0);
            } else {
                this._realBounds = new Rect(minX, minY, maxX - minX, maxY - minY);
            }
        }

        return this._realBounds;
    }

    Frame.prototype.topMargin = function () {
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

    Frame.prototype.bottomMargin = function () {
        if (this._bottomMargin === undefined) {
            this._bottomMargin = NaN;
            if (this.lines.length) {
                var b = this.bounds();
                var absHeight = b.t+b.h;

                for (var i = this.lines.length-1; i >= 0; i--) {
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

    Frame.prototype.bounds = function() {
        if (!this._bounds) {
            var left = 0, top = 0, right = 0, bottom = 0;
            if (this.lines.length) {
                var first = this.lines[0].bounds();
                left = first.l;
                top = first.t;
                this.lines.forEach(function(line) {
                    var b = line.bounds();
                    right = Math.max(right, b.l + b.w);
                    bottom = Math.max(bottom, b.t + b.h);
                });
            }
            this._bounds = new Rect(left, top, right - left, (bottom - top) || this.height);
        }
        return this._bounds;
    };

    Frame.prototype.actualWidth = function() {
        if (!this._actualWidth) {
            var result = 0;
            this.lines.forEach(function(line) {
                if (typeof line.actualWidth === 'number') {
                    result = Math.max(result, line.actualWidth);
                }
            });
            this._actualWidth = result;
        }
        return this._actualWidth;
    };
    Frame.prototype.actualWidthWithoutWrap = function() {
        let result = 0;
        let lineWidth = 0;
        for (let i = 0; i < this.lines.length; ++i){
            let line = this.lines[i];

            lineWidth += line.actualWidth;
            if (line.isWrapped()) {
                continue;
            }

            result = Math.max(result, lineWidth);
            lineWidth = 0;
        }
        return result;
    };

    Frame.prototype.children = function() {
        return this.lines;
    };

    Frame.prototype.parent = function() {
        return this._parent;
    };

    Frame.prototype.draw = function(ctx, viewPort) {
        var top = viewPort ? viewPort.t : 0;
        var bottom = viewPort ? (viewPort.t + viewPort.h) : Number.MAX_VALUE;
        this.lines.some(function(line) {
            var b = line.bounds();
            if (b.t + b.h < top) {
                return false;
            }
            if (b.t > bottom) {
                return true;
            }
            line.draw(ctx, viewPort);
        });
    };
    Frame.prototype.type = 'frame';

export default Frame;