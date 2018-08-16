import { FontInfo } from "./fontinfo";
import { IFontManager } from "carbon-app";

export class FontManager implements IFontManager {    
    defaultFont: FontInfo;
    protected fonts: FontInfo[];

    constructor() {
        this.fonts = [];
        this.defaultFont = null;
    }

    registerAsDefault() {
        FontManager.registerInstance(this);
    }

    add(font) {
        this.fonts.push(font);
        if (this.fonts.length === 1) {
            this.defaultFont = font;
        }
    }

    getFont(family, style, weight) {
        for (let i = 0; i < this.fonts.length; ++i) {
            let font = this.fonts[i];
            if (font.family === family && font.style === style && font.weight === weight) {
                return font;
            }
        }

        return null;
    }

    getDefaultFont() {
        return this.defaultFont;
    }

    tryLoad(family, style, weight): Promise<boolean> {
        return Promise.resolve(false);
    }

    getPendingTasks(): Promise<boolean>[] {
        return [];
    }

    static instance: FontManager = null;

    static registerInstance(fontManager: FontManager) {
        FontManager.instance = fontManager;
    }
}