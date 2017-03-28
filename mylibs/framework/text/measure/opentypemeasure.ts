import {cssProperty, parseFont} from "../util/util";
import MeasureResult from "./measureresult";
import Runs from "../static/runs";
import FontManager from "../font/fontmanager";

    function OpenTypeMeasure(text, style, additional) {
    	var metrics = new MeasureResult();
        var fontString = cssProperty(style,"font");
        var fontParams = parseFont(fontString, Runs.defaultFormatting);

        var font = FontManager.instance.getFont(fontParams.family, fontParams.style, fontParams.weight);
        if (!font) {
            return null;
        }
        var size = fontParams.size;
        // todo: char width cache
        var finalBounds = null;
        var scale = font.getScale(size);

        // for (var i = 0; i < text.length; i ++) {
        //     var gbounds = font.getGlyphBoundingRect(size, text.charAt(i));
        //     finalBounds = finalBounds ? finalBounds.united(gbounds) : gbounds;
        // }
        var lsb = font.getLeftSideBearing(size, text.charAt(0));
        // console.log(lsb);
        var currX = 0;//lsb;
        var len = text.length;
        var maxY = -Number.MAX_VALUE, maxX = -Number.MAX_VALUE;
        var minY = Number.MAX_VALUE, minX = Number.MAX_VALUE;

        var charSpacing = 0;
        if (additional) {
            charSpacing = additional.charSpacing;
        }

        for (var i = 0; i < len; i++) {
            var gbounds = font.getGlyphBoundingRect(size, text.charAt(i));
            var wh = gbounds.w * gbounds.h;
            if (wh !== 0 && !Number.isNaN(wh) && Number.isFinite(wh)) {
                maxY = Math.max(maxY, gbounds.t + gbounds.h);
                minY = Math.min(minY, gbounds.t);

                minX = Math.min(minX, currX + gbounds.l);
                maxX = Math.max(maxX, currX + gbounds.l + gbounds.w);
            }

            currX += font.getAdvance(size, text.charAt(i), i > 0 ? text.charAt(i-1) : null);

            if (charSpacing) {
                currX += charSpacing;
            }
        }

        // var glyph = font._openTypeFont.charToGlyph(text.charAt(len-1));
        // var metrics = glyph.getMetrics();
        // currX += isFinite(metrics.rightSideBearing) ? metrics.rightSideBearing * scale : 0;
        // console.log(currX);
        metrics.width = currX;
        metrics.ascent = font.getAscender() * scale;
        metrics.height = font.getMaxFontHeight(size);//Math.max(height, font._openTypeFont.ascender * 2 , font._openTypeFont.descender*2,font.getMaxFontHeight(size));
        //Math.abs(font._openTypeFont.ascender - font._openTypeFont.descender) * scale;
        metrics.descent = -font.getDescender() * scale;

        if (Number.isNaN(minY)) {
            metrics.minY = Number.MAX_VALUE;
        } else {
            metrics.minY = minY;
        }

        if (Number.isNaN(maxY)) {
            metrics.maxY = -Number.MAX_VALUE;
        } else {
            metrics.maxY = maxY;
        }

        if (Number.isNaN(minX)) {
            metrics.minX = Number.MAX_VALUE;
        } else {
            metrics.minX = minX;
        }

        if (Number.isNaN(maxX)) {
            metrics.maxX = -Number.MAX_VALUE;
        } else {
            metrics.maxX = maxX;
        }

        return metrics;
    }

    export default OpenTypeMeasure;
