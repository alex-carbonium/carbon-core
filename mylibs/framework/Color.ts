import tinycolor from "tinycolor2";
import * as hsluv from "hsluv";
import Brush from "./Brush";
import { BrushType } from "carbon-core";

export class Color {
    private _t:tinycolorInstance;
    private _model:string;

    static fromCssString(value:string):Color {
        let color = new Color();
        color._t = tinycolor(value);
        return color;
    }
    static fromRGB(r:number, g:number, b:number):Color{
        let color = new Color();
        color._t = tinycolor({r,g,b});
        return color;
    }
    static fromRGBA(r:number, g:number, b:number, a:number):Color{
        let color = new Color();
        color._t = tinycolor({r,g,b,a});
        return color;
    }
    static fromHSL(h:number, s:number, l:number):Color{
        let color = new Color();
        color._t = tinycolor({h,s,l});
        return color;
    }
    static fromHSLA(h:number, s:number, l:number, a:number):Color{
        let color = new Color();
        color._t = tinycolor({h,s,l,a});
        return color;
    }
    static fromHSV(h:number, s:number, v:number):Color{
        let color = new Color();
        color._t = tinycolor({h,s,v});
        return color;
    }
    static fromHSVA(h:number, s:number, v:number, a:number):Color{
        let color = new Color();
        color._t = tinycolor({h,s,v,a});
        return color;
    }
    static fromHSLuv(h:number, s:number, l:number):Color{
        let rgb = hsluv.hsluvToRgb([h, s, l]);
        let color = new Color();
        color._t = tinycolor({r:rgb[0]*255|0, g:rgb[1]*255|0, b:rgb[2]*255|0})

        return color;
    }
    static fromHSLuvA(h:number, s:number, l:number, a:number):Color{
        let rgb = hsluv.hsluvToRgb([h, s, l]);
        let color = new Color();
        color._t = tinycolor.fromRatio({r:rgb[0]*255|0, g:rgb[1]*255|0, b:rgb[2]*255|0, a:a})

        return color;
    }
    static random():Color{
        let color = new Color();
        color._t = tinycolor.random();
        return color;
    }

    get isValid():boolean {
        return this._t.isValid();
    }
    brightness():number{
        return this._t.getBrightness();
    }
    get isLight():boolean{
        return this._t.isLight();
    }

    get isDark():boolean{
        return this._t.isDark();
    }
    get luminance():number{
        return (this._t as any).getLuminance();
    }

    get alpha():number{
        return this._t.getAlpha();
    }

    lighten(amount?:number):Color{
        this._t.lighten(amount);
        return this;
    }

    darken(amount?:number):Color{
        this._t.darken(amount);
        return this;
    }

    brighten(amount?:number):Color{
        this._t.brighten(amount);
        return this;
    }
    desaturate(amount?:number):Color{
        this._t.desaturate(amount);
        return this;
    }
    saturate(amount?:number):Color{
        this._t.saturate(amount);
        return this;
    }
    spin(amount?:number):Color{
        this._t.spin(amount);
        return this;
    }
    greyscale():Color{
        this._t.greyscale();
        return this;
    }
    analogous(results?:number, slices?:number):Color[]{
        return this._t.analogous(results, slices).map(t=>{
            let color = new Color();
            color._t = t;
            return color;
        });
    }
    monochromatic(results?:number):Color[]{
        return this._t.monochromatic(results).map(t=>{
            let color = new Color();
            color._t = t;
            return color;
        });
    }
    triad():Color[]{
        return this._t.triad().map(t=>{
            let color = new Color();
            color._t = t;
            return color;
        });
    }
    tetrad():Color[]{
        return this._t.tetrad().map(t=>{
            let color = new Color();
            color._t = t;
            return color;
        });
    }
    complement():Color{
        let color = new Color();
        color._t = this._t.complement();
        return color;
    }

    toRGB():{r:number,g:number,b:number}{
        return this._t.toRgb();
    }
    toRGBA():{r:number,g:number,b:number,a:number}{
        return this._t.toRgb();
    }
    toHSL():{h:number,s:number,l:number}{
        return this._t.toHsl();
    }
    toHSLA():{h:number,s:number,l:number,a:number}{
        return this._t.toHsl();
    }
    toHSV():{h:number,s:number,v:number}{
        return this._t.toHsv();
    }
    toHSVA():{h:number,s:number,v:number,a:number}{
        return this._t.toHsv();
    }
    toHSLuv():{h:number,s:number,l:number}{
        let rgb = this._t.toRgb();
        let hsl = hsluv.rgbToHsluv([rgb.r/255, rgb.g/255, rgb.b/255]);
        return {h:hsl[0], s:hsl[1], l:hsl[2]}
    }
    toHSLuvA():{h:number,s:number,l:number,a:number}{
        let rgb = this._t.toRgb();
        let hsl = hsluv.rgbToHsluv([rgb.r/255, rgb.g/255, rgb.b/255]);
        return {h:hsl[0], s:hsl[1], l:hsl[2], a:this._t.getAlpha()}
    }

    clone() {
        let color = new Color();
        color._t = this._t.clone();

        return color;
    }

    toCssString() {
        let rgb = this._t.toRgb();
        if(rgb && rgb.hasOwnProperty('a') && rgb.a !== 1) {
            return `rgba(${rgb.r},${rgb.g},${rgb.b},${rgb.a})`
        }

        return `rgb(${rgb.r},${rgb.g},${rgb.b})`
    }

    static fromBrush(brush:Brush) {
        if(brush.type === BrushType.color) {
            return Color.fromCssString(brush.value);
        }
        return Color.fromCssString('black');
    }

    toBrush() {
        return Brush.createFromCssColor(this.toCssString());
    }
}