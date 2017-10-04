import { Font, TextRect } from "carbon-core";

export default class TestFontInfo {
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

    getScale(){
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
        return new TextRect(1, 1, 10, size);
    }

    getGlyphOutline(size, x, y, char) {
        return null;
    }

    getLeftSideBearing(fontSize, char) {
        return 1;
    }

    getMaxFontHeight(fontSize) {
        return fontSize;
    }

    getAdvance(size, nextGlyph, prevGlyph) {
        return 1;
    }
}