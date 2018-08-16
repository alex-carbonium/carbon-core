import { Font, Rect, IFontInfo, FontStyle, FontWeight } from "carbon-core";

export class TestFontInfo implements IFontInfo {
    family = 'test';
    style = FontStyle.Normal;
    weight = FontWeight.Regular;

    toFontFaceSrc() {
        return '';
    }

    getFamily() {
        return Font.Default.family;
    }
    getStyle() {
        return Font.Default.style;
    }
    getWeight() {
        return Font.Default.weight;
    }

    getFontScale(){
        return 1;
    }
    getAscender(){
        return 1;
    }
    getDescender(){
        return 1;
    }

    getGlyphBaseline(size) {
        return 1;
    }

    getGlyphBoundingRect(size, glyph) {
        return new Rect(1, 1, 10, size);
    }

    getGlyphOutline(size, x, y, char) {
        return null;
    }

    getMaxFontHeight(fontSize) {
        return fontSize;
    }

    getAdvance(size, nextGlyph, prevGlyph) {
        return 1;
    }
}