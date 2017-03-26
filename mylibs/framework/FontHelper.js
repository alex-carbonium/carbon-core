import { FontWeight, FontStyle, UnderlineStyle } from "./Defs";
import Font from "./Font";
import Invalidate from "./Invalidate";

var fontScale = [6, 8, 9, 10, 11, 12, 14, 16, 18, 24, 30, 36, 48, 60, 72];

export default {
    changeFontSize(elements, useScale: boolean, direction: number) {
        for (var i = 0; i < elements.length; i++) {
            var e = elements[i];
            var font = e.props.font;
            if (font) {
                var newSize = useScale ? this._chooseSizeFromScale(font, direction) : font.size + direction;
                var f = Font.extend(e.props.font, { size: newSize });
                e.prepareAndSetProps({ font: f });
            }
        }
    },

    _chooseSizeFromScale(font: Font, direction: number) {
        var newSize = 0;
        for (let j = 0; j < fontScale.length; ++j) {
            if (font.size >= fontScale[j] && (j === fontScale.length - 1 || font.size < fontScale[j + 1])) {
                if (direction === 1) {
                    if (j === fontScale.length - 1) {
                        break;
                    }
                    newSize = fontScale[j + 1];
                }
                else if (font.size === fontScale[j]) {
                    if (j === 0) {
                        break;
                    }
                    newSize = fontScale[j - 1];
                }
                else {
                    newSize = fontScale[j];
                }
                break;
            }
        }

        if (newSize === 0) {
            newSize = font.size >= fontScale[fontScale.length - 1] ? font.size + 10 * direction : font.size + 1 * direction;
            newSize = Math.max(1, newSize);
        }

        return newSize;
    },

    toggleFontProperty(app, elements, property) {
        if (elements.length === 0) {
            return;
        }
        var newFonts = [];
        var newValue;
        for (var i = 0; i < elements.length; i++) {
            var e = elements[i];
            var font = e.props.font;
            if (font) {
                var style = font.style, weight = font.weight, underline = font.underline;
                switch (property) {
                    case "weight":
                        if (newValue === undefined) {
                            newValue = weight === FontWeight.Bold ? FontWeight.Regular : FontWeight.Bold;
                        }
                        weight = newValue;
                        break;
                    case "style":
                        if (newValue === undefined) {
                            newValue = style === FontStyle.Normal ? FontStyle.Italic : FontStyle.Normal;
                        }
                        style = newValue;
                        break;
                    case "underline":
                        if (newValue === undefined) {
                            newValue = underline !== UnderlineStyle.None ? UnderlineStyle.None : UnderlineStyle.Solid;
                        }
                        underline = newValue;
                        break;
                }
                newFonts.push({ element: e, family: font.family, style, weight });
            }
        }

        return Promise.map(newFonts, f => app.fontManager.tryLoad(f.family, f.style, f.weight))
            .then(results => {
                var allLoaded = true;
                for (var i = 0; i < results.length; i++) {
                    var loaded = results[i];
                    if (loaded) {
                        var f = Font.extend(newFonts[i].element.props.font, { [property]: newValue });
                        newFonts[i].element.prepareAndSetProps({ font: f });
                    }
                    allLoaded &= loaded;
                }
                if (!allLoaded) {
                    console.log("//TODO: notify that not all fonts loaded")
                }
                Invalidate.request();
            });
    }
}