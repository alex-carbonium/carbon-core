declare module "carbon-text" {
    import { IRect } from "carbon-geometry";

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

    export interface IWord extends ITextNode {
    }

    export interface IPositionedWord extends ITextNode {
        word: IWord;
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
}