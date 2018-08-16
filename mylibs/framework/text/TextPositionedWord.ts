import { TextNode } from "./TextNode";
import { partRenderer, TextPartRenderer } from "./TextPartRenderer";
import { TextLine } from "./TextLine";
import Rect from "../../math/rect";
import { TextPart } from "./TextPart";
import { TextRuns } from "./TextRuns";
import { TextWord } from "./TextWord";
import { ITextPositionedWord } from "carbon-text";

var newLineWidth = function (run) {
    return partRenderer.measure(TextPartRenderer.NBSP, run).width;
}

export class TextPositionedWord extends TextNode implements ITextPositionedWord {
    word: any = null;
    line: TextLine = null;
    left = NaN;
    width = NaN;
    ordinal = null;
    length = NaN;
    _characters: PositionedChar[];

    constructor(word: TextWord, line, left, ordinal, width) {
        super('word', line, left);

        this.word = word;
        this.line = line;
        this.left = left;
        this.width = width;
        this.ordinal = ordinal;
        this.length = word.text.length + word.space.length;
    }

    /*  A positionedWord is just a realised Word plus a reference back to the containing Line and
        the left coordinate (x coordinate of the left edge of the word).

        It has methods:

            draw(ctx, x, y)
                      - Draw the word within its containing line, applying the specified (x, y)
                        offset.
            bounds()
                      - Returns a rect for the bounding box.
     */
    draw(ctx) {
        this.word.drawWord(ctx, this.line.left + this.left, this.line.baseline);

        // Handy for showing how word boundaries work
        // var b = this.bounds();
        // ctx.strokeRect(b.l, b.t, b.w, b.h);
    }

    bounds() {
        return new Rect(
            this.line.left + this.left,
            this.line.baseline - this.line.ascent,
            this.word.isNewLine() ? newLineWidth(this.word.run) : this.width,
            this.line.ascent + this.line.descent);
    }

    parts(eachPart) {
        this.word.text.parts.some(eachPart) ||
            this.word.space.parts.some(eachPart);
    }

    realiseCharacters() {
        if (!this._characters) {
            var cache: PositionedChar[] = [];
            var x = 0, self = this, ordinal = this.ordinal,
                codes = this.parentOfType('document').codes;
            this.parts(function (wordPart) {
                TextRuns.pieceCharacters(function (char) {
                    var charRun = Object.create(wordPart.run);
                    charRun.text = char;
                    var p = new TextPart(charRun, codes);
                    cache.push(new PositionedChar(x, p, self, ordinal, 1));
                    x += p.width;
                    ordinal++;
                }, wordPart.run.text);
            });
            // Last character is artificially widened to match the length of the
            // word taking into account (align === 'justify')
            var lastChar = cache[cache.length - 1];
            if (lastChar) {
                lastChar.width = this.width - lastChar.left;
                if (this.word.isNewLine() || (this.word.code() && this.word.code().eof)) {
                    lastChar.newLine = true;
                }
            }
            this._characters = cache;
        }
    }

    children() {
        this.realiseCharacters();
        return this._characters;
    }
}

export class PositionedChar extends TextNode {
    left = NaN;
    part = null;
    ordinal = null;
    length = NaN;
    width = 0;
    newLine = false;

    constructor(left, part, private word: TextPositionedWord, ordinal, length) {
        super('character', word, left);
        
        this.left = left;
        this.part = part;
        this.ordinal = ordinal;
        this.length = length;
    }

    bounds() {
        var wb = this.word.bounds();
        var width = this.word.word.isNewLine()
            ? newLineWidth(this.word.word.run)
            : this.width || this.part.width;
        return new Rect(wb.x + this.left, wb.y, width, wb.height);
    }

    byOrdinal() {
        return this;
    }

    byCoordinate(x, y) {
        if (x <= this.bounds().center().x) {
            return this;
        }
        return this.next();
    }
}
