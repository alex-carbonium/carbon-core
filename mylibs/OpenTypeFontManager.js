import OpenType from "opentype.js";
import WebFontLoader from "webfontloader";
import FontManager from "./framework/text/font/fontmanager";
import Invalidate from "./framework/Invalidate";
import OpenTypeFontInfo from "./framework/text/font/opentypefontinfo";
import { FontWeight, FontStyle } from "./framework/Defs";
import backend from "./backend";
import Promise from "bluebird";

var load = Promise.promisify(OpenType.load);

class OpenTypeFontManager extends FontManager {
    constructor() {
        super();
        this._metadata = [{
            "name": "Open Sans",
            "fonts": [
                { "style": 1, "weight": 300, "filename": "OpenSans-Light.ttf" },
                { "style": 2, "weight": 300, "filename": "OpenSans-LightItalic.ttf" },
                { "style": 1, "weight": 400, "filename": "OpenSans-Regular.ttf" },
                { "style": 2, "weight": 400, "filename": "OpenSans-Italic.ttf" },
                { "style": 1, "weight": 600, "filename": "OpenSans-Semibold.ttf" },
                { "style": 2, "weight": 600, "filename": "OpenSans-SemiboldItalic.ttf" },
                { "style": 1, "weight": 700, "filename": "OpenSans-Bold.ttf" },
                { "style": 2, "weight": 700, "filename": "OpenSans-BoldItalic.ttf" },
                { "style": 1, "weight": 800, "filename": "OpenSans-ExtraBold.ttf" },
                { "style": 2, "weight": 800, "filename": "OpenSans-ExtraBoldItalic.ttf" }
            ],
            "subsets": ["menu", "cyrillic", "cyrillic-ext", "devanagari", "greek", "greek-ext", "latin", "latin-ext", "vietnamese"],
            "path": "apache/opensans"
        }];
        this._loadQueue = [];
    }

    load(family, style, weight): Promise<void> {
        if (super.getFont(family, style, weight)) {
            return Promise.resolve();
        }

        return this._loadInternal(family, style, weight);
    }

    _loadInternal(family, style, weight): Promise<void>{
        var metadata = this.getMetadata(family);
        return this._fileLoad(metadata, style, weight).then(file => {
            if (!file.font || !file.font.supported) {
                throw new Error("Unsupported font " + metadata.name + " " + style + " " + weight);
            }
            var fontInfo = new OpenTypeFontInfo(metadata.name, style, weight, file.url, file.font);
            if (fontInfo) {
                this.add(fontInfo);
                if (!this._metadata.some(x => x.name === metadata.name)) {
                    this._metadata.push(metadata);
                }
                return this._browserLoad(fontInfo);
            }
            throw new Error("Unsupported font " + metadata.name + " " + style + " " + weight);
        });
    }

    tryLoad(family, style, weight): Promise<boolean> {
        var metadata = this.getMetadata(family);
        if (!metadata) {
            return Promise.reject();
        }
        if (!metadata.fonts.find(x => x.style === style && x.weight === weight)) {
            return Promise.resolve(false);
        }
        return this.load(metadata, style, weight)
            .then(() => true);
    }

    loadDefaultFont() {
        return this._loadInternal(this._metadata[0].name, FontStyle.Normal, FontWeight.Regular);
    }

    getFont(family, style, weight){
        var font = super.getFont(family, style, weight);
        if (!font){
            font = this.getDefaultFont();

            var metadata = this.getMetadata(family);
            if (metadata && !this._loadQueue.find(x => x.family === family && x.style === style && x.weight === weight)){
                var promise = this._loadInternal(family, style, weight)
                    .then(() => {
                        Invalidate.request();
                        var i = this._loadQueue.findIndex(x => x.family === family && x.style === style && x.weight === weight);
                        this._loadQueue.splice(i, 1);
                    });

                this._loadQueue.push({family, style, weight, promise});
            }
        }

        return font;
    }

    getPendingTasks(): Promise[]{
        return this._loadQueue.map(x => x.promise);
    }

    getMetadata(family) {
        return this._metadata.find(x => x.name === family);
    }

    tryAddMetadata(metadata): boolean {
        if (!this._metadata.find(x => x.name === metadata.name)) {
            this._metadata.push(metadata);
            return true;
        }
        return false;
    }

    appendMetadata(metadataList) {
        this._metadata = this._metadata.concat(metadataList);
    }

    _fileLoad(metadata, style, weight) {
        var font = metadata.fonts.find(x => x.style === style && x.weight === weight);
        if (!font) {
            return Promise.reject(new Error("No metadata for font " + metadata.name + " " + style + " " + weight));
        }
        var url = backend.cdnEndpoint + "/fonts/" + metadata.path + "/" + font.filename;
        return load.call(OpenType, url)
            .then(font => { return { font, url } });
    }

    _browserLoad(fontInfo) {
        var fontFaceSrc = fontInfo.toFontFaceSrc();
        var newStyle = document.createElement('style');
        newStyle.appendChild(document.createTextNode("\
            @font-face {\
                font-family: '" + fontInfo.getFamily() + "';\
                src: " + fontFaceSrc + ";\
                font-weight: " + fontInfo.getWeight() + ";\
                font-style: " + fontInfo.getCssStyle() + ";\
            }\
        "));
        document.head.appendChild(newStyle);

        return new Promise((resolve, reject) => {
            WebFontLoader.load({
                custom: {
                    families: [fontInfo.getFamily()]
                },
                timeout: 60 * 1000,
                active: function () {
                    resolve();
                },
                inactive: function () {
                    reject(new Error("Could not load font: " + fontInfo.getFamily()));
                }
            });
        });
    }
}

var openTypeFontManager = new OpenTypeFontManager();
FontManager.registerInstance(openTypeFontManager);
export default openTypeFontManager;
