import { TextLine } from "./TextLine";
import { TextNode } from "./TextNode";

export class TextWrap {
    _lineBuffer = null;
    _lineWidth = 0;
    _maxAscent = 0;
    _maxDescent = 0;
    _quit = false;
    _lastNewLineHeight = 0;
    _tempLastAscent = 0;
    _tempLastDescent = 0;
    _y = 0;
    _top = 0;
    _consumer = null;
    _parent = null;
    _ordinal = 0;
    _width = 0;
    _noWrap = false;
    _left = 0;
    _includeTerminator = undefined;
    
    constructor(left, top, width, ordinal, parent, includeTerminator, initialAscent, initialDescent, noWrap) {
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

    _store(word, emit) {
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
                this._lastNewLineHeight = (this._tempLastAscent + this._tempLastDescent);
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

    _send(emit) {
        if (this._quit || this._lineBuffer.length === 0) {
            return;
        }
        var l = new TextLine(this._parent, this._left, this._width, this._y + this._maxAscent, this._maxAscent, this._maxDescent, this._lineBuffer, this._ordinal);
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

    wrap(emit, inputWord) {
        if (this._consumer) {
            this._lastNewLineHeight = 0;
            var node: TextNode = this._consumer(inputWord);
            if (node) {
                this._consumer = null;
                this._ordinal += node.length;
                this._y += node.bounds().height;
                node.block = true;
                emit(node);
            }
        } else {
            var code = inputWord.code();
            if (code && code.block) {
                if (this._lineBuffer.length) {
                    this._send(emit);
                } else {
                    this._y += this._lastNewLineHeight;
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

}