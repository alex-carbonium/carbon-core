define(["platform/Platform"], function(platform){
    var emptyView = platform.createImage();
    emptyView.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEEAAABBCAYAAACO98lFAAAEdklEQVR4XtWcS1LkMAyGbahZsKPgALDpag7ARTkDR+mLcALWVHVBppxCjfK3ZMvxK+nNQCck8qdfDyf2+Pf39+nz89ON+jw8PLjn5+dRt3cfHx/Ov729TaMs2AKAIIBhELYCIAhgCAQrAO+9+/n5ceHfmp8QAjwFdIeQA2CaphlATRAIoLsSrADI66SAAKPGRwLQFQIHQB6uMTDrNTQA3SAggPnG3l9ineQeviOv0881gMUAdIFAAHAwNEiUPAdh9XLsvBSA5hACgKenp9lGPlgp20sqKIVgAdAUAgGQPE6hQGFQQ/IIzAqgGQQOgBtH5Y4rI/zMIdQAkgOgCQQeAhgGWum7ubmZQUzTdPbe/ysJg1wA1SFIfQCv8VJeYJ7/ds7d9gZQFQIB0LI7l7nUBPHSuAbEGgVclFljFqmVQbqJZYAcXm5eKAFQRQmWVpgGZYHBz7VMnEoBFEPQOkFNzlJ+iJ2bglADQBEEVEBsgDgBwsFhoxT6ByyjJX1AKsesmkqnAGD/TwPSvsfcgaW0JYBVStDKYKj16EFpCowq0FSiJcdaIbBo4nKqg5YEyWAsfakwkBJlLDG2AJClBEsV4C1wqiJoOUSD0AqAGYIFAHqVfg8hcnv71wji4FH2Uhi0BGCCYAHAFcAnSVJWxo4SZ5k4oWoNIAnBCgAN50+FeKbX5hEIi3JLDwBRCDkACII24BxFUPj0AqBCyAWQakZix6UK0ROACKEEgDY3kCqFlEhDGPQGcAWhBAD3tpbxtQpCHeUIAAsItQAgDC0ftG6Fc0J0nju0AJBjxCgFXBJ5WJ8wen3A6PUR/nQ61XnRl+P633NHK+DySHAUhK0AmBPjCAhbAjAEwtYAdIewRQBdIWwVQDcIWwbQBcLWATSHsAcATSHsBUAzCHsC0ATC3gBUh7BHAFUh7BVANQh7BlAFwt4BFEOwAMDnjTUXbNd6IrZ6Km0BsOI5i/lPagFYrQQLAK6A2Hok7RV8jEZNAKsgxABYB8TPi72Kl0CUApBszAqHlAK0ly80GOmN9OWJ7+/ultg1SgGo97I+XuMArB7HdxBs5Wp0wbd0/RwAktKCLVx1ZIs5HCQF5CzJz4G2BgBXD18OZNk2NN8vpYSSHIAemanDxg4eKtJahZQCUos+UAFkA7clCiEGgBvMDcFkRsdIfqk+gXs1BgCrDw1WUgW3LysxppIgehC9TEYtiLPkp61iI7iPj49XO2exksRCMhaCmHxFJUgApItKmRy/k36nTR/hmCTnAIB2zPCMrg3amp/Uv8ecYAkBSfJ8HSN6P9ULcBAYAlJFkVbJ83tqKtDsWCghFQJYYkL2xcEjAIuXCML9/b07HA7u+ztsffjbMUfHUTXmHhvKI0+OixKZAmBpeNCo1AJtfs0QAsfj0X19fS22BWPSlXKJ5T6xhDwrIRcAeV+rEJpRmkzD9V5fX935fL7aF52SvlaNJBu0+3vr/5/Al+VJhtF3OFlC6UlqeXl5cXd3d/MhSfJScg3geFnkNlmUQXYEAfwHyzQRiEE8c+kAAAAASUVORK5CYII=";
    sketch.framework.Resources["empty_view"] = emptyView;

    return sketch.ui.IconsInfo = {
        "sprites": {},
        "icons": {},
        "fonts": {},
        "default": "",
        defaultFontFamily: "NinjamockBasic2",

        findDefaultGlyphValue: function(glyphName){
            return this.findGlyphValue(this.defaultFontFamily, glyphName);
        },

        findGlyphString: function(fontFamily, glyphName){
            var value = this.findGlyphValue(fontFamily, glyphName);
            if (value >= 0){
                return String.fromCharCode(value);
            }
            return "";
        },

        findGlyphValue: function(fontFamily, glyphName){
            var glyphs = this.fonts[fontFamily];
            if (!glyphs){
                throw new Error("Font family can't be found: " + fontFamily);
            }
            for (var i = 0, l = glyphs.length; i < l; ++i){
                var glyph = glyphs[i];
                if (glyph.name === glyphName){
                    return glyph.value;
                }
            }
            return -1;
        }
    };
});
