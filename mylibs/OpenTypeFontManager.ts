import OpenType from "opentype.js";
import WebFontLoader from "webfontloader";
import FontManager from "./framework/text/font/fontmanager";
import Invalidate from "./framework/Invalidate";
import Text from "./framework/text/Text";
import TextRender from "./framework/text/static/textrender";
import OpenTypeFontInfo from "./framework/text/font/opentypefontinfo";
import { FontWeight, FontStyle } from "carbon-basics";
import backend from "./backend";
import bluebird from "bluebird";
import { IFontManager, FontMetadata, IApp } from "carbon-core";
import params from "./params";

var load = bluebird.promisify(OpenType.load);

export const DefaultFont = "Open Sans";

export default class OpenTypeFontManager extends FontManager implements IFontManager {
    _loadQueue: {family: string; style: FontStyle, weight: FontWeight, promise: Promise<any>}[];

    constructor(private app: IApp) {
        super();
        this.clear();
    }

    clear(){
        this._fonts = [];
        this._loadQueue = [];
    }

    load(family, style, weight): Promise<void> {
        if (super.getFont(family, style, weight)) {
            return Promise.resolve();
        }

        return this._loadInternal(family, style, weight);
    }

    _loadInternal(family, style, weight): Promise<void> {
        var metadata = this.getMetadata(family);
        return this._fileLoad(metadata, style, weight).then(file => {
            if (!file.font || !file.font.supported) {
                throw new Error("Unsupported font " + metadata.name + " " + style + " " + weight);
            }
            var fontInfo = new OpenTypeFontInfo(metadata.name, style, weight, file.url, file.font);
            this.add(fontInfo);
            return this._browserLoad(fontInfo);
        });
    }

    tryLoad(family, style, weight): Promise<boolean> {
        var metadata = this.getMetadata(family);
        if (!metadata) {
            return Promise.reject(false);
        }
        if (!metadata.fonts.find(x => x.style === style && x.weight === weight)) {
            return Promise.resolve(false);
        }
        return this.load(family, style, weight)
            .then(() => true);
    }

    loadDefaultFont() {
        return this._loadInternal(this.app.props.fontMetadata[0].name, FontStyle.Normal, FontWeight.Regular);
    }

    getFont(family, style, weight) {
        var font = super.getFont(family, style, weight);
        if (!font) {
            font = this.getDefaultFont();

            var metadata = this.getMetadata(family);
            if (metadata && !this._loadQueue.find(x => x.family === family && x.style === style && x.weight === weight)) {
                var promise = this._loadInternal(family, style, weight)
                    .then(() => {
                        this.resetTexts(family, style, weight);
                        var i = this._loadQueue.findIndex(x => x.family === family && x.style === style && x.weight === weight);
                        this._loadQueue.splice(i, 1);
                    });

                this._loadQueue.push({ family, style, weight, promise });
            }
        }

        return font;
    }

    private resetTexts(family: string, style: FontStyle, weight: FontWeight) {
        this.app.applyVisitorDepthFirst(element => {
            if (element instanceof Text && element.props.font.family == family
                && element.props.font.style === style
                && element.props.font.weight === weight
            ) {
                element.resetEngine();
            }
        });
        TextRender.clearCache();
        Invalidate.request();
    }

    getPendingTasks(): Promise<boolean>[] {
        return this._loadQueue.map(x => x.promise);
    }

    getMetadata(family) {
        return this.app.props.fontMetadata.find(x => x.name === family);
    }

    _fileLoad(metadata, style, weight) {
        var font = metadata.fonts.find(x => x.style === style && x.weight === weight);
        if (!font) {
            return Promise.reject(new Error("No metadata for font " + metadata.name + " " + style + " " + weight));
        }
        var cdn = backend.cdnEndpoint;
        if (DEBUG) {
            if (metadata.name !== DefaultFont) {
                cdn = params.realCdn;
            }
        }
        var url = cdn + "/fonts/" + metadata.path + "/" + font.filename;
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
                    families: [fontInfo.getFamily() + ":" + this.getFontVariationDescription(fontInfo.getWeight(), fontInfo.getStyle())]
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

    private getFontVariationDescription(weight: FontWeight, style: FontStyle) {
        let s = style === FontStyle.Italic ? "i" : "n";
        return s + (weight/100);
    }
}