import { TextPartRenderer } from "./TextPartRenderer";
import { FontMetrics } from "./FontMetrics";

class DefaultInline {
    measure(formatting) {
        var text = partRenderer.measure('?', formatting);
        return {
            width: text.width + 4,
            ascent: text.width + 2,
            descent: text.width + 2,
            minY: -text.width - 2,
            maxY: text.width + text.width + 4,
            minX: 0,
            maxX: text.width + 4
        }
    }

    draw(ctx, x, y, width, ascent, descent) {
        ctx.fillStyle = 'silver';
        ctx.fillRect(x, y - ascent, width, ascent + descent);
        ctx.strokeRect(x, y - ascent, width, ascent + descent);
        ctx.fillStyle = 'black';
        ctx.fillText('?', x + 2, y);
    }
}

const partRenderer = new TextPartRenderer();
const defaultInline = new DefaultInline();

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

export class TextPart {
    run: any = null;
    isNewLine = false;
    width = 0;
    ascent = 0;
    descent = 0;
    minY = 0;
    maxY = 0;
    minX = 0;
    maxX = 0;
    code = null;

    constructor(run, codes) {
        var m: FontMetrics, isNewLine, isSpace, code;
        if (typeof run.text === 'string') {
            if (run.text.length === 1) {
                if (run.text[0] === '\n') {
                    isNewLine = true;
                } else isNewLine = false;

                if (run.text[0] === ' ') {
                    isSpace = true;
                } else isSpace = false;
            }
            m = partRenderer.measure(isNewLine ? TextPartRenderer.NBSP : run.text, run);
        } else {
            code = codes(run.text) || defaultInline;
            m = code.measure ? code.measure(run) : new TextMetrics();
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
        this.minX = m.maxY;
        this.maxX = m.maxX;

        if (code) {
            this.code = code;
        }
    }    

    draw(ctx, x, y) {
        if (typeof this.run.text === 'string') {
            partRenderer.draw(ctx, this.run.text, this.run, x, y, this.width, this.ascent, this.descent);
        } else if (this.code && this.code.draw) {
            ctx.save();
            this.code.draw(ctx, x, y, this.width, this.ascent, this.descent, this.run);
            ctx.restore();
        }
    }
}