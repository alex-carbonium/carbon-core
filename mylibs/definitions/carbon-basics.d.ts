declare module "carbon-basics" {
    export interface Dictionary {
        [key: string]: any;
    }

    export interface IDisposable {
        dispose(): void;
    }

    export interface IEventData {
        handled: boolean;
    }

    export interface IMouseEventData extends IEventData {
        x: number;
        y: number;
        isDragging: boolean;
        cursor?: string;
    }

    export interface IEvent<T> {
        raise(data: T): void;
        bind(callback: (data: T) => void): IDisposable;
        bind(owner: any, callback: (data: T) => void): IDisposable;
        unbind(callback: (data: T) => void);
    }

    export interface IEvent2<T1, T2> {
        raise(data1: T1, data2: T2): void;
        bind(callback: (data1: T1, data2: T2) => void): IDisposable;
        bind(owner: any, callback: (data1: T1, data2: T2) => void): IDisposable;
        unbind(callback: (data1: T1, data2: T2) => void);
        unbind(owner: any, callback: (data1: T1, data2: T2) => void);
    }

    export interface IEvent3<T1, T2, T3> {
        raise(data1: T1, data2: T2, data3: T3): void;
        bind(callback: (data1: T1, data2: T2, data3: T3) => void): IDisposable;
        bind(owner: any, callback: (data1: T1, data2: T2, data3: T3) => void): IDisposable;
        unbind(callback: (data1: T1, data2: T2, data3: T3) => void);
        unbind(owner:any, callback: (data1: T1, data2: T2, data3: T3) => void);
    }

    export interface IKeyboardState {
        ctrl: boolean;
        shift: boolean;
        alt: boolean;
    }

    export const enum BrushType {
        empty,
        color,
        gradient,
        resource,
        pattern
    }

    export class Brush {
        type: BrushType;
        value: any;

        static createFromColor(color: string): Brush;
    }

    export const enum TextAlign {
        left = 1,
        center,
        right,
        justify,
        top,
        middle,
        bottom
    }

    export const enum FontWeight{
        Thin = 100,
        ExtraLight = 200,
        Light = 300,
        Regular = 400,
        Medium = 500,
        SemiBold = 600,
        Bold = 700,
        ExtraBold = 800,
        Heavy = 900
    }

    export const enum FontStyle {
        Normal = 1,
        Italic = 2
    }

    export const enum FontScript {
        Normal = 1,
        Super,
        Sub
    }

    export const enum UnderlineStyle {
        None,
        Solid,
        Dotted,
        Dashed
    }

    export class Font {
        family: string;
        size: number;
        lineSpacing: number;
        charSpacing: number;
        wordSpacing: number;
        underline: UnderlineStyle;
        strikeout: false;
        script: FontScript;
        weight: number;
        color: string;
        style: FontStyle;
        align: TextAlign;
        valign: TextAlign;

        static extend(font: Font, extension: Partial<Font>): Font;
    }

    export var util: {
        debounce(func: () => any, ms: number): () => any;
    };
}