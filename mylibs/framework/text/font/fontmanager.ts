class FontManager {
    _defaultFont: any;
    _fonts: any[];

    constructor(){
        this._fonts = [];
        this._defaultFont = null;
    }

    registerAsDefault(){
        FontManager.registerInstance(this);
    }

    getDefaultFont(){
        return this._defaultFont;
    }
    setDefaultFont(defaultFont){
        this._defaultFont = defaultFont;
    }

    add(font){
        this._fonts.push(font);
        if (this._fonts.length === 1){
            this.setDefaultFont(font);
        }
    }

    getFont(family, style, weight){
        for (var i = 0; i < this._fonts.length; ++i){
            var font = this._fonts[i];
            if (font.getFamily() === family && font.getStyle() === style && font.getWeight() === weight){
                return font;
            }
        }

        return null;
    }

    static instance: FontManager

    static registerInstance = function(fontManager){
        FontManager.instance = fontManager;
    };
}

FontManager.instance = null;

export default FontManager;