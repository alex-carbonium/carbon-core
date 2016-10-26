import TypeDefaults from "./TypeDefaults";
import Brush from "./Brush";
import {TextAlign, FontStyle, FontScript, UnderlineStyle, Types} from "./Defs";

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
};

function FontType(){
    this.t = Types.Font;
}
FontType.prototype = defaults;

var fontDefault = TypeDefaults[Types.Font] = function(){
    return new FontType();
};

// function getSizeForFamily(fromFamily, toFamily, size) {
//     var newSize = size;
//     if (fromFamily !== toFamily) {
//         var currentHeight = FontInfo.getFontHeight(fromFamily, size);
//         return FontInfo.getFontSize(toFamily, currentHeight);
//     }
//
//     return newSize;
// }

var Font = {};

Font.cssString = function(font, scale){
    var actualScale = scale || 1;
    return [
        font.italic ? "italic" : "",
        font.bold ? "bold" : defaults.weight,
        ((font.size)*actualScale) + "px",
        '"' + font.family + '"'

    ].join(' ').trim();
};

Font.isFont = function(object){
    return object && object.t === "Font";
};

Font.toString = function(font){
    return font.family
        + " " + font.size
        + " " + Brush.toString(font.color)
        + " " + font.italic
        + " " + font.bold
        + " " + font.underline
        + " " + font.lineHeight;
};


function resizeIfFamilyChanged(font, oldOne, newOne){
    // if (font.family && font.hasOwnProperty("size")){
    //     font.size = getSizeForFamily(oldOne.family, newOne.family, font.size);
    // }
    //else if (font.hasOwnProperty("defaultSize")) {  // this else if
    //    font.size = getSizeForFamily(defaults.family, font.family, font.size);
    //}
    //
    //if (font.hasOwnProperty("defaultSize")) {
    //    delete font.defaultSize;
    //}
}

Font.extend = function(...fonts){
    var font = Font.createFromObject(Object.assign({}, ...fonts));
    // if (newOne.family && newOne.family != oldOne.family)
    //     resizeIfFamilyChanged(font, oldOne, newOne);
    return font;
};

Font.createFromObject = function(values){
    return Object.assign(fontDefault(), values);
};

Font.Default = Font.createFromObject();
if (DEBUG){
    Font.Default = Object.freeze(Font.Default);
}

Font.setDefaults = function(params){
    defaults = Object.assign(defaults, params);
    Font.Default = Font.createFromObject();
    if (DEBUG){
        Font.Default = Object.freeze(Font.Default);
    }
};

Font.getDefaults = function(){
    return defaults;
};

export default Font;