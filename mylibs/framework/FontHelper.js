import {FontWeight, FontStyle, UnderlineStyle} from "./Defs";
import Font from "./Font";
import Invalidate from "./Invalidate";
import Promise from "bluebird";

export default{
    toggleFontProperty(app, elements, property){
        if (elements.length === 0){
            return;
        }
        var newFonts = [];
        var newValue;
        for (var i = 0; i < elements.length; i++){
            var e = elements[i];
            var font = e.props.font;
            if (font){
                var style = font.style, weight = font.weight, underline = font.underline;
                switch (property){
                    case "weight":
                        if (newValue === undefined){
                            newValue = weight === FontWeight.Bold ? FontWeight.Regular : FontWeight.Bold;
                        }
                        weight = newValue;
                        break;
                    case "style":
                        if (newValue === undefined){
                            newValue = style === FontStyle.Normal ? FontStyle.Italic : FontStyle.Normal;
                        }
                        style = newValue;
                        break;
                    case "underline":
                        if (newValue === undefined){
                            newValue = underline !== UnderlineStyle.None ? UnderlineStyle.None : UnderlineStyle.Solid;
                        }
                        underline = newValue;
                        break;
                }
                newFonts.push({element: e, family: font.family, style, weight});
            }
        }

        return Promise.map(newFonts, f => app.fontManager.tryLoad(f.family, f.style, f.weight))
            .then(results => {
                var allLoaded = true;
                for (var i = 0; i < results.length; i++){
                    var loaded = results[i];
                    if (loaded){
                        var f = Font.extend(newFonts[i].element.props.font, {[property]: newValue});
                        newFonts[i].element.prepareAndSetProps({font: f});
                    }
                    allLoaded &= loaded;
                }
                if (!allLoaded){
                    console.log("//TODO: notify that not all fonts loaded")
                }
                Invalidate.request();
            });
    }
}