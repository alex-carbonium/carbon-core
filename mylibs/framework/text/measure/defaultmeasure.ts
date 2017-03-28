import {cssProperty, parseFont} from "../util/util";
import MeasureResult from "./measureresult";
import FontManager from "../font/fontmanager";
import Runs from "../static/runs";

    function DefaultMeasure(text, style) {
    	var metrics = new MeasureResult();
        var fontString = cssProperty(style,"font");
        var fontParams = parseFont(fontString, Runs.defaultFormatting);
        
        var font = FontManager.instance.getDefaultFont();
        if (!font) {
            return metrics;
        }
        var size = fontParams.size;
        var finalBounds = null;
        var scale = 1 / font._openTypeFont.unitsPerEm * size;
        var currX = 0;
        var len = text.length;
        var height = 0;
        for (var i = 0; i < len; i++) {
            currX += font.getAdvance(size, text.charAt(i), i > 0 ? text.charAt(i-1) : null);
            var gbounds = font.getGlyphBoundingRect(size, text.charAt(i));
            height = Math.max(height, gbounds.h);
        }
        
        metrics.width = currX;
        metrics.ascent = font._openTypeFont.ascender * scale;
        metrics.height = font.getMaxFontHeight(size);
        metrics.descent = -font._openTypeFont.descender * scale;

        return metrics;
    }

    export default DefaultMeasure;
