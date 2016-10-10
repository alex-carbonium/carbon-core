import Line from "../processing/line";

    function Wrap(left, top, width, ordinal, parent,
                          includeTerminator, initialAscent, initialDescent, noWrap) {
        this._lineBuffer = [];
        this._maxAscent = initialAscent || 0;
        this._maxDescent = initialDescent || 0;
        this._top = top;
        this._y = top;
        this._parent = parent;
        this._ordinal = ordinal;
        this._left = left;
        this._width = width;
        this._noWrap = noWrap;
        this._includeTerminator = includeTerminator;

    }

    Wrap.prototype._lineBuffer = null;
    Wrap.prototype._lineWidth = 0;
    Wrap.prototype._maxAscent = 0;
    Wrap.prototype._maxDescent = 0;
    Wrap.prototype._quit = false;
    Wrap.prototype._lastNewLineHeight = 0;
    Wrap.prototype._tempLastAscent = 0;
    Wrap.prototype._tempLastDescent = 0;
    Wrap.prototype._y = 0;
    Wrap.prototype._top = 0;
    Wrap.prototype._consumer = null;
    Wrap.prototype._parent = null;
    Wrap.prototype._ordinal = 0;
    Wrap.prototype._width = 0;
    Wrap.prototype._noWrap = false;
    Wrap.prototype._left = 0;
    Wrap.prototype._includeTerminator = undefined;

    Wrap.prototype._store  = function(word, emit) {
        this._lineBuffer.push(word);
        this._lineWidth += word.width;

        if (!word.eof) {
            this._maxAscent = Math.max(this._maxAscent, word.ascent);
            this._maxDescent = Math.max(this._maxDescent, word.descent);
        } else {
            this._maxAscent = Math.max(this._maxAscent, this._tempLastAscent || word.ascent);
            this._maxDescent = Math.max(this._maxDescent, this._tempLastDescent || word.descent);
        }
        this._tempLastAscent = word.ascent;
        this._tempLastDescent = word.descent;

        if (word.isNewLine()) {
            var ls = this._lineBuffer[0].lineSpacing();
            this._send(emit);
            if (word.eof) {
                this._lastNewLineHeight = (this._tempLastAscent+this._tempLastDescent);
            } else {
                this._lastNewLineHeight = (word.ascent + word.descent);
            }

            if (typeof ls === "number") {
                this._lastNewLineHeight *= ls;
            } else {
                this._lastNewLineHeight += parseFloat(ls);
            }
        }
    };

    Wrap.prototype._send = function(emit) {
        if (this._quit || this._lineBuffer.length === 0) {
            return;
        }
        var l = new Line(this._parent, this._left, this._width, this._y + this._maxAscent, this._maxAscent, this._maxDescent, this._lineBuffer, this._ordinal);
        this._ordinal += l.length;
        this._quit = emit(l);
        var lh = (this._maxAscent + this._maxDescent);
        if (typeof l.lineSpacing === "number") {
            lh *= l.lineSpacing;   
        } else {
            lh += parseFloat(l.lineSpacing);
        }
         
        this._y += lh;
        this._lineBuffer.length = 0;
        this._lineWidth = this._maxAscent = this._maxDescent = 0;
    };

    Wrap.prototype.wrap = function(emit, inputWord) {
        if (this._consumer) {
            this._lastNewLineHeight = 0;
            var node = this._consumer(inputWord);
            if (node) {
                this._consumer = null;
                this._ordinal += node.length;
                this._y += node.bounds().h;
                Object.defineProperty(node, 'block', { value: true });
                emit(node);
            }
        } else {
            var code = inputWord.code();
            if (code && code.block) {
                if (this._lineBuffer.length) {
                    this._send(emit);
                } else {
                    this._y += this.lastNewLineHeight;
                }
                this._consumer = code.block(this._left, this._y, this._width, 
                    this._ordinal, this._parent, inputWord.codeFormatting(), this._noWrap);
                this._lastNewLineHeight = 0;
            }
            else if (code && code.eof || inputWord.eof) {
                if (!code || (this._includeTerminator && this._includeTerminator(code))) {
                    this._store(inputWord, emit);
                }
                if (!this._lineBuffer.length) {
                    emit(this._y + this._lastNewLineHeight - this._top);
                } else {
                    this._send(emit);
                    emit(this._y - this._top);
                }
                this._quit = true;
            } else {
                this._lastNewLineHeight = 0;
                if (!this._lineBuffer.length) {
                    this._store(inputWord, emit);
                } else {
                    if (!this._noWrap && (this._lineWidth + inputWord.text.width > this._width)) {
                        this._send(emit);
                    }
                    this._store(inputWord, emit);
                }
            }
        }
        return this._quit;
    }

export default Wrap;