import { FontInfo } from "./fontinfo";
import { FontWeight, FontStyle, IRect } from "carbon-core";
import { Font } from "opentype.js";
import Rect from "../../../math/rect";

export class OpenTypeFontInfo extends FontInfo {
    constructor(family: string, style: FontStyle, weight: FontWeight, private url: string, private openTypeFont: Font) {
        super(family, style, weight);
    }

    toFontFace(): string {
        return 'url("' + this.url + '") format("truetype")';
    }

    getGlyphBoundingRect(size: number, char: string): IRect {
        let glyph = this.openTypeFont.charToGlyph(char);
        let scale = this.getFontScale(size);
        let metrics = glyph.getMetrics();
        let height = (metrics.yMax - metrics.yMin) * scale;
        let width = (metrics.xMax - metrics.xMin) * scale;
        return new Rect(metrics.xMin * scale, -metrics.yMax * scale, width, height);
    }
    getMaxFontHeight(size: number): number {
        return (this.openTypeFont.tables.head.yMax - this.openTypeFont.tables.head.yMin) / this.openTypeFont.unitsPerEm * size;
    }
    getAdvance(size: number, nextChar: string, prevChar: string): number {
        let scale = this.getFontScale(size);
        let nextGlyph = this.openTypeFont.charToGlyph(nextChar);
        let advance = 0;

        if (nextGlyph.advanceWidth) {
            let maxAdvance = this.openTypeFont.tables.hhea.advanceWidthMax || this.openTypeFont.unitsPerEm;            
            advance = Math.min(nextGlyph.advanceWidth * scale, scale * maxAdvance);
        }

        if (prevChar) {
            let prevGlyph = this.openTypeFont.charToGlyph(prevChar);
            let kerning = this.openTypeFont.getKerningValue(prevGlyph, nextGlyph);
            advance += kerning * scale;
        }
        return advance;
    }
    getUnitsPerEm() {
        return this.openTypeFont.unitsPerEm;
    }
    getAscender() {
        return this.openTypeFont.ascender;
    }    
    getDescender(){
        return this.openTypeFont.descender;
    }

    getFontScale(size: number) {
        return 1 / this.openTypeFont.unitsPerEm * size;
    }
}