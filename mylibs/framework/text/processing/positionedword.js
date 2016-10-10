import Node from "../primitives/node";
import Rect from "../primitives/rect";
import Runs from "../static/runs";
import Part from "./part";
import TextRender from "../static/textrender";
import {inherit} from "../util/util";

    function PositionedWord(word, line, left, ordinal, width) {
        this.word = word;
        this.line = line;
        this.left = left;
        this.width = width;
        this.ordinal = ordinal;
        this.length = word.text.length + word.space.length;
    };

    inherit(PositionedWord, Node);

    var newLineWidth = function(run) {
        return TextRender.measure(TextRender.ENTER, run).width;
    };

    PositionedWord.PositionedChar = function (left, part, word, ordinal, length) {
        this.left = left;
        this.part = part;
        this.word = word;
        this.ordinal = ordinal;
        this.length = length;
    }

    inherit(PositionedWord.PositionedChar, Node);

    PositionedWord.PositionedChar.prototype.word = null;
    PositionedWord.PositionedChar.prototype.left = NaN;
    PositionedWord.PositionedChar.prototype.part = null;
    PositionedWord.PositionedChar.prototype.ordinal = null;
    PositionedWord.PositionedChar.prototype.length = NaN;

    PositionedWord.PositionedChar.prototype.bounds = function() {
        var wb = this.word.bounds();
        var width = this.word.word.isNewLine()
            ? newLineWidth(this.word.word.run)
            : this.width || this.part.width;
        return new Rect(wb.l + this.left, wb.t, width, wb.h);
    };

    PositionedWord.PositionedChar.prototype.parent = function() {
        return this.word;
    };

    PositionedWord.PositionedChar.prototype.byOrdinal = function() {
        return this;
    };

    PositionedWord.PositionedChar.prototype.byCoordinate = function(x, y) {
        if (x <= this.bounds().center().x) {
            return this;
        }
        return this.next();
    };

    PositionedWord.PositionedChar.prototype.type = 'character';

    /*  A positionedWord is just a realised Word plus a reference back to the containing Line and
        the left coordinate (x coordinate of the left edge of the word).

        It has methods:

            draw(ctx, x, y)
                      - Draw the word within its containing line, applying the specified (x, y)
                        offset.
            bounds()
                      - Returns a rect for the bounding box.
     */
    PositionedWord.prototype.draw = function(ctx) {
        this.word.draw(ctx, this.line.left + this.left, this.line.baseline);

        // Handy for showing how word boundaries work
        // var b = this.bounds();
        // ctx.strokeRect(b.l, b.t, b.w, b.h);
    };

    PositionedWord.prototype.bounds = function() {
        return new Rect(
            this.line.left + this.left,
            this.line.baseline - this.line.ascent,
            this.word.isNewLine() ? newLineWidth(this.word.run) : this.width,
            this.line.ascent + this.line.descent);
    };

    PositionedWord.prototype.parts = function(eachPart) {
        this.word.text.parts.some(eachPart) ||
        this.word.space.parts.some(eachPart);
    };

    PositionedWord.prototype.realiseCharacters = function() {
        if (!this._characters) {
            var cache = [];
            var x = 0, self = this, ordinal = this.ordinal,
                codes = this.parentOfType('document').codes;
            this.parts(function(wordPart) {
                Runs.pieceCharacters( function(char) {
                    var charRun = Object.create(wordPart.run);
                    charRun.text = char;
                    var p = new Part(charRun, codes);
                    cache.push(new PositionedWord.PositionedChar(x,p,self,ordinal,1));
                    x += p.width;
                    ordinal++;
                }, wordPart.run.text);
            });
            // Last character is artificially widened to match the length of the
            // word taking into account (align === 'justify')
            var lastChar = cache[cache.length - 1];
            if (lastChar) {
                Object.defineProperty(lastChar, 'width',
                    { value: this.width - lastChar.left });
                if (this.word.isNewLine() || (this.word.code() && this.word.code().eof)) {
                    Object.defineProperty(lastChar, 'newLine', { value: true });
                }
            }
            this._characters = cache;
        }
    };

    PositionedWord.prototype.children = function() {
        this.realiseCharacters();
        return this._characters;
    };

    PositionedWord.prototype.parent = function() {
        return this.line;
    };

    PositionedWord.prototype.type = 'word';

    PositionedWord.prototype.word = null;
    PositionedWord.prototype.line = NaN;
    PositionedWord.prototype.left = NaN;
    PositionedWord.prototype.width = NaN;
    PositionedWord.prototype.ordinal = null;
    PositionedWord.prototype.length = NaN;

    export default PositionedWord;