import { TextNode } from "../primitives/node";
import { TextAlign } from "carbon-basics";
import Rect from "../../../math/rect";
import { PositionedWord } from "./positionedword";
import { ITextLine } from "carbon-text";

/*  A Line is returned by the wrap function. It contains an array of PositionedWord objects that are
all on the same physical line in the wrapped text.

 It has a width (which is actually the same for all lines returned by the same wrap). It also has
 coordinates for baseline, ascent and descent. The ascent and descent have the maximum values of
 the individual words' ascent and descent coordinates.

It has methods:

    draw(ctx, x, y)
              - Draw all the words in the line applying the specified (x, y) offset.
    bounds()
              - Returns a Rect for the bounding box.
*/


export class Line extends TextNode implements ITextLine {
    doc = null;
    left = null;
    width = NaN;
    baseline = 0;
    ascent = 0;
    descent = 0;
    minY = Number.MAX_VALUE;
    maxY = -Number.MAX_VALUE;
    minX = Number.MAX_VALUE;
    maxX = -Number.MAX_VALUE;
    ordinal = 0;
    align = null;
    lineSpacing = 1;
    positionedWords: any;
    actualWidth: number;
    length: number;

    constructor(doc, left, width, baseline, ascent, descent, words, ordinal) {
        super('line', doc, left)

        var align = words[0].align();

        this.doc = doc; // should be called frame, or else switch to using parent on all nodes
        this.left = left;
        this.width = width;
        this.baseline = baseline;
        this.ascent = ascent;
        this.descent = descent;
        this.ordinal = ordinal;
        this.align = align;
        this.lineSpacing = words[0].lineSpacing();

        var actualWidth = 0;

        words.forEach((word) => {
            this.minX = Math.min(word.minX + actualWidth, this.minX);
            this.maxX = Math.max(word.maxX + actualWidth, this.maxX);
            actualWidth += word.width;
            this.maxY = Math.max(word.maxY, this.maxY);
            this.minY = Math.min(word.minY, this.minY);
        });
        actualWidth -= words[words.length - 1].space.width;

        var x = 0, spacing = 0;
        if (actualWidth < width) {
            switch (align) {
                case TextAlign.right:
                    x = width - actualWidth;
                    break;
                case TextAlign.center:
                    x = (width - actualWidth) / 2;
                    break;
                case TextAlign.justify:
                    if (words.length > 1 && !words[words.length - 1].isNewLine()) {
                        spacing = (width - actualWidth) / (words.length - 1);
                    }
                    break;
            }
        }

        if (this.minX !== Number.MAX_VALUE)
            this.minX += x;
        if (this.maxX !== -Number.MAX_VALUE)
            this.maxX += x;

        this.positionedWords = words.map(word => {
            var wordLeft = x;
            x += (word.width + spacing);
            var wordOrdinal = ordinal;
            ordinal += (word.text.length + word.space.length);
            return new PositionedWord(word, this, wordLeft, wordOrdinal, word.width + spacing);
        });

        this.actualWidth =  actualWidth;
        this.length =  ordinal - this.ordinal;
    }    

    bounds(minimal?) {
        if (minimal) {
            var firstWord = this.first().bounds(),
                lastWord = this.last().bounds();

            return new Rect(
                firstWord.x,
                this.baseline - this.ascent,
                (lastWord.x + lastWord.width) - firstWord.x,
                this.ascent + this.descent);
        }
        return new Rect(this.left, this.baseline - this.ascent,
            this.width, this.ascent + this.descent);
    }

    children() {
        return this.positionedWords;
    }

    isWrapped() {
        return !this.positionedWords[this.positionedWords.length - 1].word.isNewLine();
    }
}