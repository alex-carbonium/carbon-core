import {FontStyle} from "carbon-basics";

    /**
     * Abstract representation of a font
     * @class FontInfo
     * @constructor
     */
    var FontInfo: any = function() {
    };

    /**
     * Returns whether two fonts are equal which is the case when both
     * their family, weight and style matches. This also handles null values.
     * @param {FontInfo} font1
     * @param {FontInfo} font2
     * @return {Boolean}
     */
    FontInfo.equals = function (font1, font2) {
        if (!font1 || !font2) {
            return !!font1 === !!font2;
        } else {
            return font1.getFamily() === font2.getFamily() &&
                    font1.getStyle() === font2.getStyle() &&
                    font1.getWeight() === font2.getWeight();
        }
    };

    /**
     * Should return the font face src attribute
     * @return {String}
     */
    FontInfo.prototype.toFontFaceSrc = function () {
        return null;
    };

    /**
     * Returns a css hash of the font properties
     */
    FontInfo.prototype.toCssProperties = function () {
        return {
            'font-family': this.getFamily(),
            'font-style': this.getStyle(),
            'font-weight': this.getWeight() ? this.getWeight().toString() : null
        };
    };

    /**
     * Return the font's family
     * @return {String}
     */
    FontInfo.prototype.getFamily = function () {
        throw new Error('Not implemented');
    };

    /**
     * Return the font's style
     * @return {FontInfo.Style}
     */
    FontInfo.prototype.getStyle = function () {
        throw new Error('Not implemented');
    };

    /**
     * Return the font's style to use in css
     * @return {string}
     */
    FontInfo.prototype.getCssStyle = function () {
        var style = this.getStyle();
        if (style === FontStyle.Normal){
            return "normal";
        }
        return "italic";
    };

    /**
     * Return the font's weight
     * @return {FontInfo.Weight}
     */
    FontInfo.prototype.getWeight = function () {
        throw new Error('Not implemented');
    };

    /**
     * Return the baseline for this font for a given font-size
     * @param {Number} size the font size to be used
     * @returns {Number} the baseline
     */
    FontInfo.prototype.getGlyphBaseline = function (size) {
        throw new Error('Not implemented');
    };

    /**
     * Return the bounding rect with 0,0 at baseline origin for a given
     * size and character within this font
     * @param {Number} size the font size to be used
     * @param {Char} glyph the glyph to get the bounding rect for
     * @returns {Rect}
     */
    FontInfo.prototype.getGlyphBoundingRect = function (size, glyph) {
        throw new Error('Not implemented');
    };

    /**
     * Return the outline for a given glyph on a given size and position
     * @param {Number} size the font size to be used
     * @param {Number} x horizontal position
     * @param {Number} y vertical position
     * @param {Char} glyph the glyph to get the bounding rect for
     * @returns {GVertexSource}
     */
    FontInfo.prototype.getGlyphOutline = function (size, x, y, glyph) {
        throw new Error('Not implemented');
    };

    /**
     * Returns left side bearing of given size and char
     * @param {Number} size the font size to be used
     * @param {Char} glyph the glyph which left side bearing is to be computed
     * @returns {Number}
     */
    FontInfo.prototype.getLeftSideBearing = function(size, glyph) {
        throw new Error('Not implemented');
    };

    /**
     * Returns maximum height for all glyphs in the font
     * @param {Number} size the font size to be used
     * @returns {Number}
     */
    FontInfo.prototype.getMaxFontHeight = function(size) {
        throw new Error('Not implemented');
    };

    /**
     * Returns advance width between previous and current glyph, taking into account font's kerning data.
     * @param {Number} size the font size to be used for computing advance
     * @param {Char} nextGlyph the glyph that is to be put after space determined by advance width
     * @param {Char} prevGlyph the glyph that follows the advance space
     * @returns {Number}
     */
    FontInfo.prototype.getAdvance = function(size, nextGlyph, prevGlyph) {
        throw new Error('Not implemented');
    };

    export default FontInfo;