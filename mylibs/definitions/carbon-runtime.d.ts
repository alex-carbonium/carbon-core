declare module "carbon-runtime" {
    /// <reference path="carbon-runtime-names"/>;
    export type AnimationProps = { [name: string]: number };
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

        static createFromColor(color: string): Brush;
        static createFromLinearGradientObject(value: LinearGradientData): Brush;
        static toCss(brush: Brush): any;
        static isValid(brush: Brush): boolean;

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
        ondragging: (e: { dx: number, dy: number, target: TUIElement }) => void;
        onbegindrag: (e: { target: TUIElement }) => void;
        onenddrag: (e: { target: TUIElement }) => void;
        constraint: DragConstraint;
    }

    interface TUIElement extends TUIElementProps {
        animate(props: AnimationProps, duration?: number, options?: any, progress?: () => void): Promise<void>;
        readonly parent: TContainer;
        readonly draggable: TDraggable;
    }

    interface TContainer extends TUIElement {
        readonly children: ReadonlyArray<(TUIElement | TContainer)>;
        add(element: TUIElement);
        remove(element: TUIElement);
        insert(element: TUIElement, index: number);
    }

    interface TSymbol extends TUIElement {
        states: string[];
        currentState: string;
        nextState(): boolean;
        prevState(): boolean;
    }

    interface TArtboard extends MouseEventHandler {
        readonly width: number;
        readonly height: number;
        readonly name: string;

        readonly children: ReadonlyArray<(TUIElement | TContainer)>;
        add(element: TUIElement);
        remove(element: TUIElement);
        insert(element: TUIElement, index: number);
    }

    interface Property<T> {
        get(): T;
        set(value: T): void;
    }

    interface IDisposable {
        dispose();
    }

    interface Event<T> {
        registerHandler(callback: (data: DataBag) => void | Promise<void>): IDisposable;
        raise(data?: DataBag): boolean | void | Promise<boolean | void>;
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
    }

    interface ScrollEventHandler {
        onScroll: EventCallback<{
            scrollX: number,
            scrollY: number
        }>;
    }

    interface TArtboardFrame extends TUIElement, TArtboardFrameProps, ScrollEventHandler {
        scrollX: number;
        scrollY: number;
        scrollVertical: boolean;
        scrollHorizontal: boolean;
        verticalSnapPoints: number[];
        horizontalSnapPoints: number[];
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
        static createArtboardFrame(props?: Partial<TArtboardFrameProps>): TArtboardFrame;
    }

    type EdgeSwipeEventCallback = EventCallback<{
        distance:number;
        edge:ScreenEdge;
        event:PointerEvent;
        stopPropagation():void;
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
        EaseOut = 2,
        EaseIn = 3,
        EaseInOut = 4
    }

    export interface IAnimationOptions {
        /**
         * A string, set to ease by default. (Optional).
         */
        curve?: EasingType
        /**
         * An object with the options of the set curve. (Optional)
         */
        curveOptions?: any;
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
        //colorModel?:any;
    }

    export interface INavigationAnimationOptions extends IAnimationOptions {
        type: AnimationType;
    }

    type BasicType = string | number | boolean;

    type DataBag = BasicType | { [key: string]: BasicType | DataBag };

    /*
    * Navigation controller
    */
    interface INavigationController {
        navigateTo(artboard: ArtboardNames, animationOptions?: INavigationAnimationOptions, data?: DataBag)
        navigateBack();
    }
}