import Runs from "../static/runs";
import Per from "../util/per";
import Part from "../processing/part";

    /*  A Word has the following properties:

            text      - Section (see below) for non-space portion of word.
            space     - Section for trailing space portion of word.
            ascent    - Ascent (distance from baseline to top) for whole word
            descent   - Descent (distance from baseline to bottom) for whole word
            width     - Width of the whole word (including trailing space)

        It has methods:

            isNewLine()
                      - Returns true if the Word represents a newline. Newlines are
                        always represented by separate words.

            draw(ctx, x, y)
                      - Draws the Word at x, y on the canvas context ctx.

        Note: a section (i.e. text and space) is an object containing:

            parts     - array of Parts
            ascent    - Ascent (distance from baseline to top) for whole section
            descent   - Descent (distance from baseline to bottom) for whole section
            width     - Width of the whole section
     */
    function Word(coords, codes) {
        var text, space;
        if (!coords) {
            // special end-of-document marker, mostly like a newline with no formatting
            text = [{ text: '\n' }];
            space = [];
        } else {
            text = coords.text.cut(coords.spaces);
            space = coords.spaces.cut(coords.end);
        }

        text = Word.section(text, codes);
        if (!text) {
            throw new Error("Couldn't measure text");
        }

        space = Word.section(space, codes);
        if (!space) {
            throw new Error("Couldn't measure space");
        }

        this.text = text;
        this.space = space;
        if (!coords) {
            this.eof = true;
        }

        this.ascent = Math.max(text.ascent, space.ascent);
        this.descent = Math.max(text.descent, space.descent);
        this.minY = text.minY;
        this.maxY = text.maxY;
        this.minX = text.minX;
        this.maxX = text.maxX;

        this.width = text.width + space.width;
        this.length = text.length + space.length;
    };

    Word.prototype.text = null;
    Word.prototype.space = null;
    Word.prototype.ascent = 0;
    Word.prototype.descent = 0;
    Word.prototype.minY = 0;
    Word.prototype.maxY = 0;
    Word.prototype.minX = 0;
    Word.prototype.maxX = 0;
    Word.prototype.width = 0;
    Word.prototype.length = 0;
    Word.prototype.eof = false;

    Word.prototype.isNewLine = function() {
        return this.text.parts.length == 1 && this.text.parts[0].isNewLine;
    };

    Word.prototype.code = function() {
        return this.text.parts.length == 1 && this.text.parts[0].code;
    };

    Word.prototype.codeFormatting = function() {
        return this.text.parts.length == 1 && this.text.parts[0].run;
    };

    Word.prototype.draw = function(ctx, x, y) {
        Per.create(this.text.parts).concat(this.space.parts).forEach(function(part) {
            part.draw(ctx, x, y);
            x += part.width;
        });
    };

    Word.prototype.plainText = function() {
        return this.text.plainText + this.space.plainText;
    };

    Word.prototype.align = function() {
        var first = this.text.parts[0];
        return first && first.run.align ? first.run.align : Runs.defaultFormatting.align;
    };

    Word.prototype.lineSpacing = function() {
        var first = this.text.parts[0];
        return first && first.run.lineSpacing ? first.run.lineSpacing : Runs.defaultFormatting.lineSpacing;
    };

    Word.prototype.runs = function(emit, range) {
        var start = range && range.start || 0,
            end = range && range.end;
        if (typeof end !== 'number') {
            end = Number.MAX_VALUE;
        }
        [this.text, this.space].forEach(function(section) {
            section.parts.some(function(part) {
                if (start >= end || end <= 0) {
                    return true;
                }
                var run = part.run, text = run.text;
                if (typeof text === 'string') {
                    if (start <= 0 && end >= text.length) {
                        emit(run);
                    } else if (start < text.length) {
                        var pieceRun = Object.create(run);
                        var firstChar = Math.max(0, start);
                        pieceRun.text = text.substr(
                            firstChar,
                            Math.min(text.length, end - firstChar)
                        );
                        emit(pieceRun);
                    }
                    start -= text.length;
                    end -= text.length;
                } else {
                    if (start <= 0 && end >= 1) {
                        emit(run);
                    }
                    start--;
                    end--;
                }
            });
        });
    }

    Word.section = function(runEmitter, codes) {
        var sParts;
        try {
            sParts = Per.create(runEmitter).map(function(p) {
                var part = new Part(p, codes);
                return part;
            }).all();
        } catch (e){
            return null;
        }

        var s = {
            parts: sParts,
            ascent: 0,
            descent: 0,
            minY: Number.MAX_VALUE,
            maxY: -Number.MAX_VALUE,
            minX: Number.MAX_VALUE,
            maxX: -Number.MAX_VALUE,
            width: 0,
            length: 0,
            plainText: ''
        };
        s.parts.forEach(function(p) {
            s.ascent = Math.max(s.ascent, p.ascent);
            s.descent = Math.max(s.descent, p.descent);
            s.minY = Math.min(s.minY, p.minY);
            s.maxY = Math.max(s.maxY, p.maxY);
            s.minX = Math.min(s.minX, p.minX + s.width);
            s.maxX = Math.max(s.maxX, p.maxX + s.width);
            s.width += p.width;
            s.length += Runs.getPieceLength(p.run.text);
            s.plainText += Runs.getPiecePlainText(p.run.text);
        });

        return s;
    };

    export default Word;
