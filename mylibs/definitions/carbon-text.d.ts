declare module "carbon-text" {
    import { IRect } from "carbon-geometry";
    import { FontWeight, FontStyle, UnderlineStyle, TextAlign, FontScript } from "carbon-basics";

    export type Emitter<T> = (p: T) => void;
    export type Functor = (f: Functor, val?: any) => void;

    export interface ITextNode {        
        type: string;
        parent: ITextNode;
        children(): ITextNode[];
        first(): ITextNode;

        ordinal: number;
        length: number;
        bounds(): IRect;
    }

    export interface ITextRange {
    }

    export interface ITextWord extends ITextNode {
    }

    export interface ITextPositionedWord extends ITextNode {
        word: ITextWord;
    }

    export interface ITextLine extends ITextNode {
        baseline: number;
    }

    export interface ITextFrame extends ITextNode {
    }

    export interface ITextDoc extends ITextNode {
        frame: ITextFrame;

        runs(f: Functor, val: any);
        splice(start: number, end: number, text: string);

        paragraphRange(start: number, end: number): ITextRange;

        modifyInsertFormatting(attribute, value);        
    }

    export interface TextFormatting {
        size: number;
        family: string;
        weight: FontWeight;
        style: FontStyle;
        color: string;
        underline: UnderlineStyle;
        strikeout: boolean;
        align: TextAlign;
        script: FontScript;
        charSpacing: number;
        lineSpacing: number;
        wordSpacing: number
        valign: TextAlign;
    }

    export type LazyFormatting = () => TextFormatting;
}