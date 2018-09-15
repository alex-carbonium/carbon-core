import OpenType from "opentype.js";
import WebFontLoader from "webfontloader";
import Invalidate from "../Invalidate";
import Text from "./Text";
import {partRenderer} from "./TextPartRenderer";
import { FontWeight, FontStyle } from "carbon-basics";
import backend from "../../backend";
import bluebird from "bluebird";
import { IFontManager, FontMetadata, IApp } from "carbon-core";
import params from "../../params";
import { FontManager } from "./fontmanager";
import { OpenTypeFontInfo } from "./OpenTypeFontInfo";

var load = bluebird.promisify(OpenType.load);

export const DefaultFont = "Open Sans";

export class OpenTypeFontManager extends FontManager implements IFontManager {
    private loadQueue: {family: string; style: FontStyle, weight: FontWeight, promise: Promise<any>}[];

    constructor(private app: IApp) {
        super();
        this.clear();
    }

    clear(){
        this.fonts = [];
        this.loadQueue = [];
    }

    load(family: string, style: FontStyle, weight: FontWeight): Promise<void> {
        if (super.getFont(family, style, weight)) {
            return Promise.resolve();
        }

        return this.loadInternal(family, style, weight);
    }

    private loadInternal(family: string, style: FontStyle, weight: FontWeight): Promise<void> {
        var metadata = this.getMetadata(family);
        return this.fileLoad(metadata, style, weight).then(file => {
            if (!file.font || !file.font.supported) {
                throw new Error("Unsupported font " + metadata.name + " " + style + " " + weight);
            }
            var fontInfo = new OpenTypeFontInfo(metadata.name, style, weight, file.url, file.font);
            this.add(fontInfo);
            return this.browserLoad(fontInfo);
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
        return this.loadInternal(this.app.props.fontMetadata[0].name, FontStyle.Normal, FontWeight.Regular);
    }

    getFont(family, style, weight) {
        let font = super.getFont(family, style, weight);
        if (!font) {
            font = this.defaultFont;

            var metadata = this.getMetadata(family);
            if (metadata && !this.loadQueue.find(x => x.family === family && x.style === style && x.weight === weight)) {
                let promise = this.loadInternal(family, style, weight)
                    .then(() => {
                        this.resetTexts(family, style, weight);
                        let i = this.loadQueue.findIndex(x => x.family === family && x.style === style && x.weight === weight);
                        this.loadQueue.splice(i, 1);
                    });

                this.loadQueue.push({ family, style, weight, promise });
            }
        }

        return font;
    }

    private resetTexts(family: string, style: FontStyle, weight: FontWeight) {
        this.app.applyVisitorDepthFirst(element => {
            if (element instanceof Text && element.props.font.family === family
                && element.props.font.style === style
                && element.props.font.weight === weight
            ) {
                element.resetAdapter();
            }
        });
        partRenderer.clearCache();
        Invalidate.request();
    }

    getPendingTasks(): Promise<boolean>[] {
        return this.loadQueue.map(x => x.promise);
    }

    getMetadata(family: string) {
        return this.app.props.fontMetadata.find(x => x.name === family);
    }

    private fileLoad(metadata: FontMetadata, style: FontStyle, weight: FontWeight) {
        let font = metadata.fonts.find(x => x.style === style && x.weight === weight);
        if (!font) {
            return Promise.reject(new Error("No metadata for font " + metadata.name + " " + style + " " + weight));
        }
        let cdn = backend.cdnEndpoint;
        if (DEBUG) {
            if (metadata.name !== DefaultFont) {
                cdn = params.realCdn;
            }
        }
        let url = cdn + "/fonts/" + metadata.path + "/" + font.filename;
        return load.call(OpenType, url)
            .then(font => { return { font, url } });
    }

    private browserLoad(fontInfo: OpenTypeFontInfo) {
        var fontFaceSrc = fontInfo.toFontFace();
        var newStyle = document.createElement('style');
        newStyle.appendChild(document.createTextNode("\
            @font-face {\
                font-family: '" + fontInfo.family + "';\
                src: " + fontFaceSrc + ";\
                font-weight: " + fontInfo.weight + ";\
                font-style: " + fontInfo.getCssStyle() + ";\
            }\
        "));
        document.head.appendChild(newStyle);

        return new Promise((resolve, reject) => {
            WebFontLoader.load({
                custom: {
                    families: [fontInfo.family + ":" + this.getFontVariationDescription(fontInfo.weight, fontInfo.style)]
                },
                timeout: 60 * 1000,
                active: function () {
                    resolve();
                },
                inactive: function () {
                    reject(new Error("Could not load font: " + fontInfo.family));
                }
            });
        });
    }

    private getFontVariationDescription(weight: FontWeight, style: FontStyle) {
        let s = style === FontStyle.Italic ? "i" : "n";
        return s + (weight/100);
    }
}