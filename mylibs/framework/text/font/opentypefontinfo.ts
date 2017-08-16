import FontInfo from "./fontinfo";
import Rect from "../primitives/rect";
import {inherit} from "../util/util";

    /**
     * A font implementation based on OpenType.js
     * @class OpenTypeFontInfo
     * @constructor
     */
    function OpenTypeFontInfo(family, style, weight, url, openTypeFont) {
        this._family = family;
        this._style = style;
        this._weight = weight;
        this._url = url;
        this._openTypeFont = openTypeFont;
        this._outlines = {};
    };

    inherit(OpenTypeFontInfo, FontInfo);

    /**
     * @type {String}
     * @private
     */
    OpenTypeFontInfo.prototype._family = null;

    /**
     * @type {FontInfo.Style}
     * @private
     */
    OpenTypeFontInfo.prototype._style = null;

    /**
     * @type {FontInfo.Weight}
     * @private
     */
    OpenTypeFontInfo.prototype._weight = null;

    /**
     * @type {GVertexContainer}
     * @private
     */
    OpenTypeFontInfo.prototype._outlines = null;

    /**
     * @type {*}
     * @private
     */
    OpenTypeFontInfo.prototype._openTypeFont = null;

    /** @override */
    OpenTypeFontInfo.prototype.toFontFaceSrc = function () {
        return 'url("' + this._url + '") format("truetype")';
    };

    /** @override */
    OpenTypeFontInfo.prototype.getFamily = function () {
        return this._family;
    };

    /** @override */
    OpenTypeFontInfo.prototype.getStyle = function () {
        return this._style;
    };

    /** @override */
    OpenTypeFontInfo.prototype.getWeight = function () {
        return this._weight;
    };

    /** @override */
    OpenTypeFontInfo.prototype.getGlyphBaseline = function (size) {
        var scale = this.getScale(size);
        return this._openTypeFont.ascender * scale;
    };

    /** @override */
    OpenTypeFontInfo.prototype.getGlyphBoundingRect = function (size, glyph) {
        var glyph = this._openTypeFont.charToGlyph(glyph);
        var scale = this.getScale(size);
        var metrics = glyph.getMetrics();
        var height = (metrics.yMax - metrics.yMin) * scale;
        var width = (metrics.xMax - metrics.xMin) * scale;
        return new Rect(metrics.xMin * scale, -metrics.yMax * scale, width, height);
    };

    /** @override */
    OpenTypeFontInfo.prototype.getGlyphOutline = function (size, x, y, char) {
        var outline = this._outlines[char];
        var scale = this.getScale(size);

        if (!outline) {
            var glyph = this._openTypeFont.charToGlyph(char);
            var path = glyph.getPath(0, 0, this._openTypeFont.unitsPerEm);
        }

        return null;
    };

    OpenTypeFontInfo.prototype.getLeftSideBearing = function(fontSize, char) {
        var glyph = this._openTypeFont.charToGlyph(char);
        var ret = glyph.leftSideBearing / this._openTypeFont.unitsPerEm * fontSize;
        return ret;
    }

    OpenTypeFontInfo.prototype.getMaxFontHeight = function(fontSize) {
        var ret = (-this._openTypeFont.tables.head.yMin+this._openTypeFont.tables.head.yMax) / this._openTypeFont.unitsPerEm * fontSize;
        return ret;
    }

    OpenTypeFontInfo.prototype.getScale = function(size){
        return 1 / this._openTypeFont.unitsPerEm * size;
    }

    OpenTypeFontInfo.prototype.getUnitsPerEm = function(){
        return this._openTypeFont.unitsPerEm;
    }

    OpenTypeFontInfo.prototype.getAdvance = function(size, nextGlyph, prevGlyph) {
        var scale = this.getScale(size);
        var glyph = this._openTypeFont.charToGlyph(nextGlyph);
        var adv = 0;

        if (glyph.advanceWidth) {
            var amax = this._openTypeFont.tables.hhea.advanceWidthMax;
            if (!amax) amax = this._openTypeFont.unitsPerEm;
            adv = Math.min( glyph.advanceWidth * scale, scale * amax );
        }

        if (prevGlyph) {
            var kerning = this._openTypeFont.getKerningValue(prevGlyph, nextGlyph);
            adv += kerning * scale;
        }
        return adv;
    }

    OpenTypeFontInfo.prototype.getAscender = function(){
        return this._openTypeFont.ascender;
    }

    OpenTypeFontInfo.prototype.getDescender = function(){
        return this._openTypeFont.descender;
    }

    export default OpenTypeFontInfo;