declare module "carbon-runtime" {
    /// <reference path="carbon-runtime-names"/>;
    type PropNames = "x"|"y"|"angle"|"width"|"height"|"fill"|"stroke"|"strokeWidth"|"opacity"|"visible"|"margin"|"padding"|"cornerRadius"|"dashPattern";
    export type AnimationProps = { [name: string]: any };
    export const enum BrushType {
        empty,
        color,
        lineargradient,
        resource,
        pattern
    }

    export const enum ScreenEdge {
        Top = 0,
        Right = 1,
        Bottom = 2,
        Left = 3
    }

    export interface LinearGradientData {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
        stops: any[];
    }

    export class Brush {
        type: BrushType;
        value: any;
        o:number;
        e:boolean;

        static createFromCssColor(color: string): Brush;
        static createFromLinearGradientObject(value: LinearGradientData): Brush;
        static toCss(brush: Brush): any;
        static isValid(brush: Brush): boolean;

        static clone(brush:Brush):Brush;
        static extend(brush:Brush, object:any):Brush;

        static Empty: Brush;
    }

    export type TextContent = string | any[];//TODO: specify range format

    interface TUIElementProps {
        readonly name: string;
        x: number;
        y: number;
        width: number;
        height: number;
        visible: boolean;
        angle: number;
        fill: string | Brush;
        stroke: string | Brush;
        opacity: number;
    }

    type DragConstraint = {
        type: "box";
        left: number;
        top: number;
        right: number;
        bottom: number;
    } |
        {
            type: "parent"
        };

    interface TDraggable {
        enabled: boolean;
        horizontal: boolean;
        vertical: boolean;
        onDragging: (e: { dx: number, dy: number, target: TUIElement, preventDefault: () => void, stopPropagation: () => void }) => void;
        onBeginDrag: (e: { target: TUIElement, preventDefault: () => void, stopPropagation: () => void }) => void;
        onEndDrag: (e: { target: TUIElement }) => void;
        constraint: DragConstraint;
    }

    interface TRect {
        x: number;
        y: number;
        width: number;
        height: number;
    }

    interface IAnimatable {
        animate(props: AnimationProps, options?: IAnimationOptions, progress?: () => void): Promise<void>;
    }

    interface TUIElement extends TUIElementProps, IAnimatable, MouseEventHandler {
        boundaryRect(): TRect;
        clone(): TUIElement;
        center(): { x: number, y: number };
        registerEventHandler(eventName: string, callback: (data?: DataBag) => void | Promise<void | boolean>);
        raiseEvent(eventName: string, data?: DataBag);
        readonly parent: TContainer;
        readonly draggable: TDraggable;
    }

    interface TContainer extends TUIElement {
        readonly children: ReadonlyArray<(TUIElement | TContainer)>;
        add(element: TUIElement);
        remove(element: TUIElement);
        insert(element: TUIElement, index: number);
    }

    interface TSymbolProps extends TUIElementProps {
        currentState: string;
    }

    interface TSymbol extends TUIElement, TSymbolProps {
        readonly states: string[];
        nextState(): boolean;
        prevState(): boolean;
    }

    interface TArtboardProps extends TUIElementProps {
        readonly width: number;
        readonly height: number;
        readonly name: string;
        currentState:string;
    }

    interface TArtboard extends TArtboardProps, MouseEventHandler {
        readonly children: ReadonlyArray<(TUIElement | TContainer)>;
        add(element: TUIElement);
        remove(element: TUIElement);
        insert(element: TUIElement, index: number);

        findElementByName(name: string): TUIElement;
        attachDisposable(disposable: IDisposable);

        registerEventHandler(eventName: string, callback: (data?: DataBag) => void | Promise<void | boolean>);
        raiseEvent(eventName: string, data?: DataBag);

        readonly states: string[];
        nextState(): boolean;
        prevState(): boolean;

        registerStateAnimation(fromState:StateNames, toState:StateNames, defaultAnimationOptions:IAnimationOptions, elementAnimationOptions?:{
            [element:string]:{[prop:string]:IAnimationOptions}
        })
    }

    interface Property<T> {
        get(): T;
        set(value: T): void;
    }

    interface IDisposable {
        dispose();
    }

    interface Event<T=DataBag> {
        registerHandler(callback: (data: T) => void | Promise<void>): IDisposable;
        raise(data?: T): boolean | void | Promise<boolean | void>;
    }

    interface TSize {
        width: number;
        height: number;
    }

    interface TTextProps extends TUIElementProps {
        content: TextContent;
    }

    type TextInputArgs = { plainText: string, content: TextContent };

    interface TTextEventHandler {
        onTextInput: EventCallback<TextInputArgs>;
    }

    interface TText extends TUIElement, TTextProps, TTextEventHandler {

    }

    interface TImageProps extends TUIElementProps {

    }

    interface TImage extends TUIElement {

    }

    interface TRectangleProps extends TUIElementProps {

    }

    interface TRectangle extends TUIElement {

    }

    interface TArtboardFrameProps extends TUIElementProps {
        artboardName: ArtboardNames;
        scrollX: number;
        scrollY: number;
    }

    interface ScrollEventHandler {
        onScroll: EventCallback<{
            scrollX: number,
            scrollY: number
        }>;
    }

    interface TArtboardFrame extends TUIElement, TArtboardFrameProps, ScrollEventHandler {
        scrollVertical: boolean;
        scrollHorizontal: boolean;
        verticalSnapPoints: number[];
        horizontalSnapPoints: number[];
        fitSizeToContent();
    }

    interface TPathProps extends TUIElementProps {
        readonly points: ReadonlyArray<TPathPoint>;
    }

    interface TPath extends TUIElement {

    }

    interface TCircleProps extends TUIElementProps {

    }

    interface TCircle extends TUIElement {

    }

    interface TStarProps extends TUIElementProps {
        pointsCount: number;
        radius: number;
        internalRadius: number;
    }

    interface TStar extends TUIElement, TStarProps {

    }

    interface TPathPoint {
        x: number;
        y: number;

        // TODO:
    }

    class Model {
        static createProperty<T=number | string | DataBag>(getter: () => T, setter?: (value: T) => void): Property<T>;
        static createEvent<T=number | string | DataBag>(): Event<T>;

        static createText(props?: Partial<TTextProps>): TText;
        static createImage(props?: Partial<TImageProps>): TImage;
        static createRectangle(props?: Partial<TRectangleProps>): TRectangle;
        static createOval(props?: Partial<TCircleProps>): TCircle;
        static createStar(props?: Partial<TStarProps>): TStar;
        static createPath(props?: Partial<TPathProps>): TPath;
        static createArtboardFrame(props?: Partial<TArtboardFrameProps>): Promise<TArtboardFrame>;
    }

    type EdgeSwipeEventCallback = EventCallback<{
        distance: number;
        edge: ScreenEdge;
        event: PointerEvent;
        stopPropagation(): void;
    }>

    var DeviceScreen: {
        readonly width: number;
        readonly height: number;
        // perspective:number;
        // perspectiveOriginX:number;
        // perspectiveOriginY:number;
        onEdgeSwipe: EdgeSwipeEventCallback;
        onEdgeSwipeStart: EdgeSwipeEventCallback;
        onEdgeSwipeEnd: EdgeSwipeEventCallback;
    };

    interface MouseEvent {
        x: number;
        y: number;
        alt: boolean;
        ctrl: boolean;
        shift: boolean;
        cmd: boolean;
        stopPropagation(): void;
        preventDefault(): void;
    }

    interface PointerEvent {
        pointers: { x: number, y: number }[];
        alt: boolean;
        ctrl: boolean;
        shift: boolean;
        cmd: boolean;
        pointerId: any;
        pressure: number;
        pointerType: "mouse" | "pen" | "touch";
        direction: "up" | "down" | "left" | "right";
        angle: number;
        isPrimary: boolean;
        stopPropagation(): void;
        preventDefault(): void;
    }

    // interface AnimationConstructor {
    //     new(element:TPath, a:number);
    //     new(element:TRectangle, a:MouseEvent);
    // }

    // const Animation:AnimationConstructor;

    type EventCallback<T> = (e: T) => boolean | void | Promise<boolean | void>;
    type MouseEventCallback = EventCallback<MouseEvent>;

    type PointerEventCallback = EventCallback<PointerEvent>;

    interface MouseEventHandler {
        onClick: MouseEventCallback;
        onDblClick: MouseEventCallback;
        onMouseDown: MouseEventCallback;
        onMouseUp: MouseEventCallback;
        onMouseMove: MouseEventCallback;
        onMouseEnter: MouseEventCallback;
        onMouseLeave: MouseEventCallback;
        onMouseWheel: MouseEventCallback;
        onPanMove: PointerEventCallback;
        onPanStart: PointerEventCallback;
        onPanEnd: PointerEventCallback;
        onPinch: PointerEventCallback;
        onPinchStart: PointerEventCallback;
        onPinchEnd: PointerEventCallback;
        onTap: PointerEventCallback;
        onDoubleTap: PointerEventCallback;
    }

    export const enum AnimationType {
        None = 0,
        SlideLeft = 1,
        SlideRight = 2,
        SlideUp = 3,
        SlideDown = 4,
        Dissolve = 5
    }

    export const enum EasingType {
        None = 0,
        Linear,
        EaseInQuad,
        EaseOutQuad,
        EaseInOutQuad,
        EaseInCubic,
        EaseOutCubic,
        EaseInOutCubic,
        EaseInQuart,
        EaseOutQuart,
        EaseInOutQuart,
        EaseInQuint,
        EaseOutQuint,
        EaseInOutQuint,
        EaseInSine,
        EaseOutSine,
        EaseInOutSine,
        EaseInExpo,
        EaseOutExpo,
        EaseInOutExpo,
        EaseInCirc,
        EaseOutCirc,
        EaseInOutCirc,
        EaseInElastic,
        EaseOutElastic,
        EaseInOutElastic,
        EaseInBack,
        EaseOutBack,
        EaseInOutBack,
        EaseInBounce,
        EaseOutBounce,
        EaseInOutBounce
    }

    export type EasingFunction = (time: number, from: number, to: number, duration: number) => number;

    export interface IAnimationOptions {
        /**
         * A string, set to ease by default. (Optional).
         */
        curve?: EasingType | EasingFunction
        /**
         * A number, the duration in seconds. (Optional)
         */
        duration?: number;
        /**
         * A number, the delay in seconds of the animation. (Optional)
         */
        delay?: number;
        /**
         * A number, the amount of times it repeats. (Optional)
         */
        repeat?: number;
        //A string, the model to animate colors in. (Optional)
        colorModel?:"hsluv"|"rgb"|"hsl"|"hsv";
    }

    export class PropertyAnimation {
        constructor(element: TUIElement, props: AnimationProps, options: IAnimationOptions);
        start(): Promise<void>;
        stop();
        restart();
        reset();
        finish();
        onAnimationEnd: () => void;
    }

    export class Color {
        static fromCssString(value: string): Color;
        static fromRGB(r: number, g: number, b: number): Color;
        static fromRGBA(r: number, g: number, b: number, a: number): Color;
        static fromHSL(h: number, s: number, l: number): Color;
        static fromHSLA(h: number, s: number, l: number, a: number): Color;
        static fromHSV(h: number, s: number, v: number): Color;
        static fromHSVA(h: number, s: number, v: number, a: number): Color;
        static fromHSLuv(h: number, s: number, v: number): Color;
        static fromHSLuvA(h: number, s: number, v: number, a: number): Color;
        static fromBrush(brush: Brush): Color;
        static random(): Color;

        isValid: boolean;
        getBrightness: number;
        isLight: boolean;
        isDark: boolean;
        readonly luminance: number;
        alpha: number;

        lighten(amount?: number): Color;
        brighten(amount?: number): Color;
        darken(amount?: number): Color;
        desaturate(amount?: number): Color;
        saturate(amount?: number): Color;
        spin(amount?: number): Color;
        greyscale(): Color;
        analogous(results?: number, slices?: number): Color[];
        monochromatic(results?: number): Color[];
        triad(): Color[];
        tetrad(): Color[];
        complement(): Color;

        toRGB(): { r: number, g: number, b: number };
        toRGBA(): { r: number, g: number, b: number, a: number };
        toHSL(): { h: number, s: number, l: number };
        toHSLA(): { h: number, s: number, l: number, a: number };
        toHSV(): { h: number, s: number, v: number };
        toHSVA(): { h: number, s: number, v: number, a: number };
        toHSLuv(): { h: number, s: number, l: number };
        toHSLuvA(): { h: number, s: number, l: number, a: number };

        toCssString(): string;
        toBrush(): Brush;

        clone(): Color;
    }

    export interface INavigationAnimationOptions extends IAnimationOptions {
        type: AnimationType;
    }

    export interface ICustomTransition {
        transitionFunction: (oldArtboard: TArtboard & IAnimatable, newArtboard: TArtboard & IAnimatable) => Promise<any>;
    }

    type BasicType = string | number | boolean;

    type DataBag = BasicType | { [key: string]: BasicType | DataBag };

    /*
    * Navigation controller
    */
    interface INavigationController {
        navigateTo(artboard: ArtboardNames, animationOptions?: INavigationAnimationOptions|ICustomTransition, data?: DataBag)
        navigateBack();
    }
}