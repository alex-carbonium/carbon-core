import Runs from "./runs";
import OpenTypeMeasure from "../measure/opentypemeasure";

import {FontStyle, FontScript, UnderlineStyle} from "framework/Defs";

    /* TODO: cache keys should be hashes instead of these stupid strings */
    function TextRender() {

    }

    TextRender.getFontString = function(run) {
        var size = (run && run.size) || Runs.defaultFormatting.size;
        var script = run && run.script !== undefined ? run.script : Runs.defaultFormatting.script;

        switch (script) {
            case FontScript.Super:
            case FontScript.Sub:
                size *= 0.8;
                break;
        }

        var styleId = ((run && run.style) || Runs.defaultFormatting.style);
        var style = styleId === FontStyle.Normal ? "normal" : "italic";

        return style  + " " +
               ((run && run.weight) || Runs.defaultFormatting.weight) + " " +
                size + 'px ' +
              ((run && run.family) || Runs.defaultFormatting.family);
    };

    /*  
    Applies the style of a run to the canvas context
     */
    TextRender.applyRunStyle = function(ctx, run) {
        ctx.fillStyle = (run && run.color) || Runs.defaultFormatting.color;
        ctx.font = TextRender.getFontString(run);

        ctx.charSpacing = run.charSpacing || Runs.defaultFormatting.charSpacing;
    };

    TextRender.prepareContext = function(ctx) {
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    };

    /* Generates the value for a CSS style attribute
     */
    TextRender.getRunStyle = function(run, ignoreColor) {
        var parts = [
            'font: ', TextRender.getFontString(run)
        ];

        if (!ignoreColor) {
            parts.push( '; color: ', ((run && run.color) || Runs.defaultFormatting.color) );
        }

        var script = run && run.script !== undefined ? run.script : Runs.defaultFormatting.script;
        switch (script) {
            case FontScript.Super:
                parts.push('; vertical-align: super');
                break;
            case FontScript.Sub:
                parts.push('; vertical-align: sub');
                break;
        }

        return parts.join('');
    };

    TextRender.getAdditionalProps = function (run) {
        if (run) {
            var addProps = {charSpacing:0};
            var charSpacing = run.charSpacing || Runs.defaultFormatting.charSpacing;
            if (charSpacing) {
                addProps.charSpacing = run.charSpacing;
            }
            return addProps;
        }
        return null;
    }

    TextRender.NBSP = String.fromCharCode(160);
    TextRender.ENTER = TextRender.NBSP;

    TextRender.measureText = function(text, style, additional) {
        return OpenTypeMeasure(text, style, additional);
    };

    TextRender.createCachedMeasureText = function() {
        var cache = {};
        return function(text, style, additional) {
            var key = style + '<>!&%' + text;
            if (additional) {
                key += '<>!&%' + JSON.stringify(additional);
            }
            var result = cache[key];
            if (!result) {
                result = TextRender.measureText(text, style, additional);
                if (result) {
                    cache[key] = result;
                } else {
                    result = null;
                }
            }
            return result;
        };
    };

    TextRender.cachedMeasureText = TextRender.createCachedMeasureText();

    TextRender.measure = function(str, formatting) {
        return TextRender.cachedMeasureText(str, TextRender.getRunStyle(formatting, true), TextRender.getAdditionalProps(formatting));
    };

    TextRender.draw = function(ctx, str, formatting, left, baseline, width, ascent, descent) {
        TextRender.prepareContext(ctx);
        TextRender.applyRunStyle(ctx, formatting);

        var underline = formatting.underline !== undefined ? formatting.underline : Runs.defaultFormatting.underline;
        var strikeout = formatting.strikeout !== undefined ? formatting.strikeout : Runs.defaultFormatting.strikeout;
        var script = formatting.script !== undefined ? formatting.script : Runs.defaultFormatting.script;

        switch (script) {
            case FontScript.Super:
                baseline -= ascent/3;
                break;
            case FontScript.Sub:
                baseline += descent/2;
                break;
        }
        baseline = baseline + .5|0;
        ctx.drawText(str === '\n' ? TextRender.NBSP : str, left, baseline);
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
    };

export default TextRender;