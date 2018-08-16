import { FontStyle, FontScript, UnderlineStyle } from "carbon-basics";
import { OpenTypeFontMeasure } from "./OpenTypeFontMeasure";
import { TextRuns } from "./TextRuns";
import { FontMetrics } from "./FontMetrics";

export class TextPartRenderer {
    private measurer = new OpenTypeFontMeasure();

    getFontString(run) {
        var size = (run && run.size) || TextRuns.defaultFormatting.size;
        var script = run && run.script !== undefined ? run.script : TextRuns.defaultFormatting.script;

        switch (script) {
            case FontScript.Super:
            case FontScript.Sub:
                size *= 0.8;
                break;
        }

        var styleId = ((run && run.style) || TextRuns.defaultFormatting.style);
        var style = styleId === FontStyle.Normal ? "normal" : "italic";

        return style  + " " +
               ((run && run.weight) || TextRuns.defaultFormatting.weight) + " " +
                size + 'px ' +
              ((run && run.family) || TextRuns.defaultFormatting.family);
    }

    applyRunStyle(ctx, run) {
        ctx.fillStyle = (run && run.color) || TextRuns.defaultFormatting.color;
        ctx.font = this.getFontString(run);

        ctx.charSpacing = run.charSpacing || TextRuns.defaultFormatting.charSpacing;
    }

    prepareContext(ctx) {
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }

    /* Generates the value for a CSS style attribute
     */
    getRunStyle(run, ignoreColor) {
        var parts = [
            'font: ', this.getFontString(run)
        ];

        if (!ignoreColor) {
            parts.push( '; color: ', ((run && run.color) || TextRuns.defaultFormatting.color) );
        }

        var script = run && run.script !== undefined ? run.script : TextRuns.defaultFormatting.script;
        switch (script) {
            case FontScript.Super:
                parts.push('; vertical-align: super');
                break;
            case FontScript.Sub:
                parts.push('; vertical-align: sub');
                break;
        }

        return parts.join('');
    }

    getAdditionalProps(run) {
        if (run) {
            var addProps = {charSpacing:0};
            var charSpacing = run.charSpacing || TextRuns.defaultFormatting.charSpacing;
            if (charSpacing) {
                addProps.charSpacing = run.charSpacing;
            }
            return addProps;
        }
        return null;
    }

    static readonly NBSP = String.fromCharCode(160);    

    measureText(text, style, additional): FontMetrics {
        return this.measurer.calcualteMetrics(text, style, additional);
    }

    cache: {[key: string]: FontMetrics} = {};

    clearCache() {
        this.cache = {};
    }

    cachedMeasureText(text, style, additional) {
        var key = style + '<>!&%' + text;
        if (additional) {
            key += '<>!&%' + JSON.stringify(additional);
        }
        var result = this.cache[key];
        if (!result) {
            result = this.measureText(text, style, additional);
            if (result) {
                this.cache[key] = result;
            }
            else {
                result = null;
            }
        }
        return result;
    }

    measure(str, formatting) {
        return this.cachedMeasureText(str, this.getRunStyle(formatting, true), this.getAdditionalProps(formatting));
    }

    draw(ctx, str, formatting, left, baseline, width, ascent, descent) {
        this.prepareContext(ctx);
        this.applyRunStyle(ctx, formatting);

        var underline = formatting.underline !== undefined ? formatting.underline : TextRuns.defaultFormatting.underline;
        var strikeout = formatting.strikeout !== undefined ? formatting.strikeout : TextRuns.defaultFormatting.strikeout;
        var script = formatting.script !== undefined ? formatting.script : TextRuns.defaultFormatting.script;

        switch (script) {
            case FontScript.Super:
                baseline -= ascent/3;
                break;
            case FontScript.Sub:
                baseline += descent/2;
                break;
        }
        baseline = baseline + .5|0;
        ctx.drawText(str === '\n' ? TextPartRenderer.NBSP : str, left, baseline);
        if (underline) {
            var dash = null;
            switch (underline){
                case UnderlineStyle.Dashed:
                    dash = [6, 3];
                    break;
                case UnderlineStyle.Dotted:
                    dash = [2, 2];
                    break;
            }
            ctx.lineH(left, baseline + descent/2 + .5|0, width + .5|0, dash);
        }
        if (strikeout) {
            ctx.lineH(left, baseline - ascent/2 -.5|0, width + .5|0);
        }
    }
}

export const partRenderer = new TextPartRenderer();