import { cssProperty, parseFont } from "./TextUtil";
import { FontManager } from "./fontmanager";
import { FontMetrics } from "./FontMetrics";
import { FontStyle } from "carbon-core";
import { OpenTypeFontInfo } from "./OpenTypeFontInfo";
import { TextRuns } from "./TextRuns";

export class OpenTypeFontMeasure {
    calcualteMetrics(text: string, style: FontStyle, additional?: any): FontMetrics {
        let fontString = cssProperty(style, "font");
        let fontParams = parseFont(fontString, TextRuns.defaultFormatting);

        let font = FontManager.instance.getFont(fontParams.family, fontParams.style, fontParams.weight) as OpenTypeFontInfo;
        if (!font) {
            return null;
        }
        let size = fontParams.size;
        let scale = font.getFontScale(size);

        let x = 0;
        let maxY = -Number.MAX_VALUE, maxX = -Number.MAX_VALUE;
        let minY = Number.MAX_VALUE, minX = Number.MAX_VALUE;

        let charSpacing = 0;
        if (additional) {
            charSpacing = additional.charSpacing;
        }

        for (let i = 0; i < text.length; i++) {
            let bbox = font.getGlyphBoundingRect(size, text.charAt(i));
            let area = bbox.width * bbox.height;
            if (area !== 0 && !Number.isNaN(area) && Number.isFinite(area)) {
                maxY = Math.max(maxY, bbox.y + bbox.height);
                minY = Math.min(minY, bbox.y);

                minX = Math.min(minX, x + bbox.x);
                maxX = Math.max(maxX, x + bbox.x + bbox.width);
            }

            x += font.getAdvance(size, text.charAt(i), i > 0 ? text.charAt(i - 1) : null);

            if (charSpacing) {
                x += charSpacing;
            }
        }

        let height = font.getMaxFontHeight(size);
        let ascender = font.getAscender() * scale;
        let descender = -font.getDescender() * scale;        

        return new FontMetrics(x, height, ascender, descender, minY, maxY);
    }
}