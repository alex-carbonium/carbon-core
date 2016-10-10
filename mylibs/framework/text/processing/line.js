import Node from "../primitives/node";
import Rect from "../primitives/rect";
import PositionedWord from "./positionedword";
import {inherit} from "../util/util";

import {TextAlign} from "framework/Defs";

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

    function Line(doc, left, width, baseline, ascent, descent, words, ordinal) {
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

        words.forEach(function(word) {
            this.minX = Math.min(word.minX + actualWidth, this.minX);
            this.maxX = Math.max(word.maxX + actualWidth, this.maxX);
            actualWidth += word.width;
            this.maxY = Math.max(word.maxY,this.maxY);
            this.minY = Math.min(word.minY,this.minY);
        }.bind(this));
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

        Object.defineProperty(this, 'positionedWords', {
            value: words.map(function(word) {
                var wordLeft = x;
                x += (word.width + spacing);
                var wordOrdinal = ordinal;
                ordinal += (word.text.length + word.space.length);
                return new PositionedWord(word, this, wordLeft, wordOrdinal, word.width + spacing);
            }.bind(this))
        });

        Object.defineProperty(this, 'actualWidth', { value: actualWidth });
        Object.defineProperty(this, 'length', { value: ordinal - this.ordinal });
    };

    inherit(Line, Node);

    Line.prototype.bounds = function(minimal) {
        if (minimal) {
            var firstWord = this.first().bounds(),
                lastWord = this.last().bounds();
            return new Rect(
                firstWord.l,
                this.baseline - this.ascent,
                (lastWord.l + lastWord.w) - firstWord.l,
                this.ascent + this.descent);
        }
        return new Rect(this.left, this.baseline - this.ascent,
            this.width, this.ascent + this.descent);
    };

    Line.prototype.parent = function() {
        return this.doc;
    };

    Line.prototype.children = function() {
        return this.positionedWords;
    };

    Line.prototype.type = 'line';

    Line.prototype.doc = null;
    Line.prototype.left = null;
    Line.prototype.width = NaN;
    Line.prototype.baseline = 0;
    Line.prototype.ascent = 0;
    Line.prototype.descent = 0;
    Line.prototype.minY = Number.MAX_VALUE;
    Line.prototype.maxY = -Number.MAX_VALUE;
    Line.prototype.minX = Number.MAX_VALUE;
    Line.prototype.maxX = -Number.MAX_VALUE;
    Line.prototype.ordinal = 0;
    Line.prototype.align = null;
    Line.prototype.lineSpacing = 1;

    export default Line;