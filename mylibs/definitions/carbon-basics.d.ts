declare module "carbon-basics" {
    import { ICoordinate } from "carbon-geometry";
    import { AppSettings } from "carbon-core";

    export interface IConstructor<T> {
        new (): T;
    }

    export interface IDisposable {
        dispose(): void;
    }

    export interface IPooledObject {
        reset();
        free();
    }

    export interface IEventData {
        handled: boolean;
    }

    export interface IMouseEventData extends IEventData, ICoordinate {
        x: number;
        y: number;
        isDragging: boolean;
        cursor?: string;
        event:MouseEvent;
    }

    export interface IEvent<T> {
        raise(): void;
        raise(data: T): void;
        bind(callback: (data: T) => void): IDisposable;
        bindAsync(callback: (data: T) => void): IDisposable;
        bind(owner: any, callback: (data: T) => void): IDisposable;
        bindHighPriority(owner: any, callback: (data: T) => void): IDisposable;
        bindAsync(owner: any, callback: (data: T) => void): IDisposable;
        unbind(callback: (data: T) => void);
        unbind(owner: any, callback: (data: T) => void);
        clearSubscribers();
    }

    export interface IEvent2<T1, T2> {
        raise(data1: T1, data2: T2): void;
        bind(callback: (data1: T1, data2: T2) => void): IDisposable;
        bindHighPriority(callback: (data1: T1, data2: T2) => void): IDisposable;
        bindAsync(callback: (data1: T1, data2: T2) => void): IDisposable;
        bind(owner: any, callback: (data1: T1, data2: T2) => void): IDisposable;
        bindAsync(owner: any, callback: (data1: T1, data2: T2) => void): IDisposable;
        bindHighPriority(owner: any, callback: (data1: T1, data2: T2) => void): IDisposable;
        unbind(callback: (data1: T1, data2: T2) => void);
        unbind(owner: any, callback: (data1: T1, data2: T2) => void);
        clearSubscribers();
    }

    export interface IEvent3<T1, T2, T3> {
        raise(data1: T1, data2: T2, data3: T3): void;
        bind(callback: (data1: T1, data2: T2, data3: T3) => void): IDisposable;
        bindHighPriority(callback: (data1: T1, data2: T2, data3: T3) => void): IDisposable;
        bindAsync(callback: (data1: T1, data2: T2, data3: T3) => void): IDisposable;
        bind(owner: any, callback: (data1: T1, data2: T2, data3: T3) => void): IDisposable;
        bindHighPriority(owner: any, callback: (data1: T1, data2: T2, data3: T3) => void): IDisposable;
        bindAsync(owner: any, callback: (data1: T1, data2: T2, data3: T3) => void): IDisposable;
        unbind(callback: (data1: T1, data2: T2, data3: T3) => void);
        unbind(owner: any, callback: (data1: T1, data2: T2, data3: T3) => void);
        clearSubscribers();
    }

    export interface IKeyboardState {
        ctrl: boolean;
        shift: boolean;
        alt: boolean;
    }

    export const enum ChangeMode {
        Model, //update model
        Root, //update node and its root, skip model update
        Self //update node only
    }

    export const enum PatchType {
        Insert = 1,
        Remove = 2,
        Change = 3
    }

    export const enum BrushType {
        empty,
        color,
        lineargradient,
        resource,
        pattern
    }

    export interface LinearGradientData {
        x1:number;
        y1:number;
        x2:number;
        y2:number;
        stops:any[];
    }

    export class Brush {
        type: BrushType;
        value: any;

        static createFromColor(color: string): Brush;
        static createFromLinearGradientObject(value: LinearGradientData): Brush;
        static toCss(brush: Brush): any;

        static Empty: Brush;
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

    export const enum FontWeight {
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

        static cssString(font: Font, scale: number): string;
        static extend(font: Font, extension: Partial<Font>): Font;
        static Default: Font;
    }

    export class Shadow {
        static Default: Shadow;
    }

    export class QuadAndLock {
        locked: boolean;

        static Default: QuadAndLock;
        static createFromObject(obj: any): QuadAndLock;
        static extend(quad: QuadAndLock, extension: Partial<QuadAndLock>): QuadAndLock;
    }

    export class Box {
        left: number;
        top: number;
        right: number;
        bottom: number;

        static Default: Box;
    }

    export interface IJsonNode {
        props: {
            id: string;
            name: string;
        }
        children?: IJsonNode[];
    }

    export const enum PrimitiveType {
        None = 0,
        //deferred
        DataNodeAdd = 1,
        DataNodeRemove = 2,
        DataNodeChange = 3,
        DataNodeSetProps = 4,
        DataNodeChangePosition = 5,
        DataNodePatchProps = 6,
        Selection = 7,
        View = 8,

        //immediate
        ProjectSettingsChange = 100
    }

    export interface IPrimitive {
        type: PrimitiveType;
        path: string[];
        sessionId: string;

        id: string;
        time: number;

        _rollbackData?: PrimitiveKind;
    }

    export type PrimitiveKind =
        IPrimitive & { type: PrimitiveType.DataNodeAdd, node: IJsonNode, index: number } |
        IPrimitive & { type: PrimitiveType.DataNodeRemove, childId: string } |
        IPrimitive & { type: PrimitiveType.DataNodeSetProps, props: object } |
        IPrimitive & { type: PrimitiveType.DataNodePatchProps, patchType: PatchType, propName: string, item: object } |
        IPrimitive & { type: PrimitiveType.DataNodeChange, node: IJsonNode } |
        IPrimitive & { type: PrimitiveType.DataNodeChangePosition, childId: string, newPosition: number } |
        IPrimitive & { type: PrimitiveType.Selection, userId: string, selection: string[] } |
        IPrimitive & { type: PrimitiveType.View, oldState: ViewState, newState: ViewState } |

        IPrimitive & { type: PrimitiveType.ProjectSettingsChange, companyId: string, projectId: string, settings: AppSettings };


    export type NodePrimitivesMap = { [nodeId: string]: IPrimitive[] };

    export type ViewState = {
        scale: number;
        sx: number;
        sy: number;
    }

    export const enum VerticalConstraint {
        Top = 1,
        Bottom = 2,
        TopBottom = 3,
        Center = 4,
        Scale = 8
    }

    export const enum HorizontalConstraint {
        Left = 1,
        Right = 2,
        LeftRight = 3,
        Center = 4,
        Scale = 8
    }

    export const enum ArtboardType {
        Regular = 0,
        Symbol = 1,
        Template = 2,
        Frame = 3,
        Palette = 4,
        IconSet = 5
    }

    export interface IConstraints {
        h: HorizontalConstraint,
        v: VerticalConstraint
    }

    export const Constraints: {
        readonly Default: IConstraints;
        readonly All: IConstraints;
        readonly StretchAll: IConstraints;

        create(h: HorizontalConstraint, v: VerticalConstraint): IConstraints;
    }

    export type LoginProvider = "Google" | "Facebook" | "Twitter" | "Microsoft";
}