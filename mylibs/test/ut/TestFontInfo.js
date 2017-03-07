import OpenTypeFontInfo from "../../framework/text/font/opentypefontinfo";
import Rect from "../../framework/text/primitives/rect";
import Font from "../../framework/Font";

export default class TestFontInfo extends OpenTypeFontInfo {
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
        return new Rect(1, 1, 1, 1);
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