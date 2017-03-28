import TextRender from "../static/textrender";
import MeasureResult from "../measure/measureresult";

    /*  A Part is a section of a word with its own run, because a Word can span the
        boundaries between runs, so it may have several parts in its text or space
        arrays.

            run           - Run being measured.
            isNewLine     - True if this part only contain a newline (\n). This will be
                            the only Part in the Word, and this is the only way newlines
                            ever occur.
            width         - Width of the run
            ascent        - Distance from baseline to top
            descent       - Distance from baseline to bottom

        And methods:

            draw(ctx, x, y)
                          - Draws the Word at x, y on the canvas context ctx. The y
                            coordinate is assumed to be the baseline. The call
                            prepareContext(ctx) will set the canvas up appropriately.
     */
    var Part: any = function(run, codes) {
        var m, isNewLine, isSpace, code;
        if (typeof run.text === 'string') {
            if (run.text.length === 1) {
                if (run.text[0] === '\n') {
                    isNewLine = true;
                } else isNewLine = false;

                if (run.text[0] === ' ') {
                    isSpace = true;
                } else isSpace = false;
            }
            m = TextRender.measure(isNewLine ? TextRender.NBSP : run.text, run);
        } else {
            code = codes(run.text) || Part.DefaultInline;
            m = code.measure ? code.measure(run) : new MeasureResult();
        }

        if (!m) {
            throw new Error('Measurement failed.');
        }

        this.run = run;
        this.isNewLine = isNewLine;
        this.width = isNewLine ? 0 : m.width;

        if (isSpace && (typeof run.wordSpacing === 'number')) {
            this.width += run.wordSpacing;
        }
        this.ascent = m.ascent;
        this.descent = m.descent;
        this.minY = m.minY;
        this.maxY = m.maxY;
        this.minX = m.minX;
        this.maxX = m.maxX;

        if (code) {
            this.code = code;
        }
    }

    Part.prototype.run = null;
    Part.prototype.isNewLine = false;
    Part.prototype.width = 0;
    Part.prototype.ascent = 0;
    Part.prototype.descent = 0;
    Part.prototype.minY = 0;
    Part.prototype.maxY = 0;
    Part.prototype.minX = 0;
    Part.prototype.maxX = 0;
    Part.prototype.code = null;

    Part.prototype.draw = function(ctx, x, y) {
        if (typeof this.run.text === 'string') {
            TextRender.draw(ctx, this.run.text, this.run, x, y, this.width, this.ascent, this.descent);
        } else if (this.code && this.code.draw) {
            ctx.save();
            this.code.draw(ctx, x, y, this.width, this.ascent, this.descent, this.run);
            ctx.restore();
        }
    }

    Part.DefaultInline = function() {

    }

    Part.DefaultInline.measure = function(formatting) {
        var text = TextRender.measure('?', formatting);
        return {
            width: text.width + 4,
            ascent: text.width + 2,
            descent: text.width + 2,
            minY: -text.width-2,
            maxY: text.width+text.width+4,
            minX: 0,
            maxX: text.width+4
        };
    };

    Part.DefaultInline.draw = function(ctx, x, y, width, ascent, descent) {
        ctx.fillStyle = 'silver';
        ctx.fillRect(x, y - ascent, width, ascent + descent);
        ctx.strokeRect(x, y - ascent, width, ascent + descent);
        ctx.fillStyle = 'black';
        ctx.fillText('?', x + 2, y);
    };

    export default Part;

