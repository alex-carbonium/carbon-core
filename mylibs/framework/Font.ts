import TypeDefaults from "./TypeDefaults";
import Brush from "./Brush";
import { TextAlign, FontStyle, FontScript, UnderlineStyle } from "carbon-basics";
import { Types } from "./Defs";

var defaults = {
    family: "Open Sans",
    size: 22,
    lineSpacing: 1,
    charSpacing: 0,
    wordSpacing: 0,
    underline: UnderlineStyle.None,
    strikeout: false,
    script: FontScript.Normal,
    weight: 400,
    color: "black",
    style: FontStyle.Normal,
    align: TextAlign.left,
    valign: TextAlign.top
}

var fontDefault = TypeDefaults[Types.Font] = function () {
    return new Font();
}

export default class Font {
    t: string;
    family: string;
    size: number;
    lineSpacing: number;
    charSpacing: number;
    wordSpacing: number;
    underline: UnderlineStyle;
    strikeout: false;
    script: FontScript;
    weight: number;
    color: string;
    style: FontStyle;
    align: TextAlign;
    valign: TextAlign;

    constructor(){
        this.t = Types.Font;
    }

    static cssString(font, scale?) {
        var actualScale = scale || 1;
        return [
            font.italic ? "italic" : "",
            font.bold ? "bold" : defaults.weight,
            ((font.size) * actualScale) + "px",
            '"' + font.family + '"'

        ].join(' ').trim();
    }

    static isFont(object) {
        return object && object.t === "Font";
    }

    static toString(font) {
        return font.family
            + " " + font.size
            + " " + Brush.toString(font.color)
            + " " + font.italic
            + " " + font.bold
            + " " + font.underline
            + " " + font.lineHeight;
    }

    static extend(...fonts) {
        return Font.createFromObject(Object.assign({}, ...fonts));
    }

    static createFromObject(values?) {
        return Object.assign(fontDefault(), values);
    }

    static setDefaults(params) {
        defaults = Object.assign(defaults, params);
        Font.Default = Font.createFromObject();
        if (DEBUG) {
            Font.Default = Object.freeze(Font.Default);
        }
    }

    static getDefaults() {
        return defaults;
    }

    static Default: Font;
}
Object.assign(Font.prototype, defaults);

Font.Default = Object.freeze(Font.createFromObject());