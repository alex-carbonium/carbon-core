import { FontStyle, FontWeight, IRect, IFontInfo } from "carbon-core";

export abstract class FontInfo implements IFontInfo {
    constructor(
        public readonly family: string, 
        public readonly style: FontStyle, 
        public readonly weight: FontWeight
    ) {    
    }        
    
    getCssStyle(): string {        
        if (this.style === FontStyle.Normal){
            return "normal";
        }
        return "italic";
    }

    abstract toFontFace(): string;
    abstract getGlyphBoundingRect(size: number, char: string): IRect;
    abstract getMaxFontHeight(size: number): number;
    abstract getAdvance(size: number, nextChar: string, prevChar: string): number;
    abstract getUnitsPerEm(): number;
    abstract getAscender(): number;
    abstract getDescender(): number;
    abstract getFontScale(size: number): number;
}