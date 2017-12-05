declare module "carbon-runtime" {
    /// <reference path="carbon-runtime-names"/>;
    /// <reference path="runtime-platform"/>;
    export type AnimationProps = { [name: string]: number };
    interface Brush{

    }

    interface TUIElementProps {
        readonly name: string;
        x: number;
        y: number;
        width: number;
        height: number;
        visible: boolean;
        angle: number;
        fill:string|Brush;
        stroke:string|Brush;
    }

    export interface TUIElement extends TUIElementProps {
        animate(props: AnimationProps, duration?: number, options?: any, progress?: () => void): Promise<void>;
        readonly parent: TContainer;
    }

    interface TContainer extends TUIElement {
        readonly children: ReadonlyArray<(TUIElement | TContainer)>;
        add(element: TUIElement);
        remove(element: TUIElement);
        insert(element: TUIElement, index: number);
    }

    export interface TSymbol extends TUIElement {
        states: string[];
        currentState: string;
        nextState(): boolean;
        prevState(): boolean;
    }

    export interface TArtboard extends MouseEventHandler {
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

    }

    interface TText extends TUIElement {

    }

    interface TImageProps extends TUIElementProps {

    }

    interface TImage extends TUIElement {

    }

    interface TRectangleProps extends TUIElementProps {

    }

    interface TRectangle extends TUIElement {

    }

    interface TPathProps extends TUIElementProps {
        readonly points:ReadonlyArray<TPathPoint>;
    }

    interface TPath extends TUIElement {

    }

    interface TCircleProps extends TUIElementProps {

    }

    interface TCircle extends TUIElement {

    }

    interface TStarProps extends TUIElementProps {
        pointsCount:number;
        radius:number;
        internalRadius:number;
    }

    interface TStar extends TUIElement, TStarProps {

    }

    interface TPathPoint {
        x:number;
        y:number;

        // TODO:
    }

    class Model {
        static createProperty<T=number | string | DataBag>(getter: () => T, setter?: (value: T) => void): Property<T>;
        static createEvent<T=number | string | DataBag>(): Event<T>;

        static createText(props?: Partial<TTextProps>): TText;
        static createImage(props?: Partial<TImageProps>): TImage;
        static createRectangle(props?: Partial<TRectangleProps>): TRectangle;
        static createOval(props?: Partial<TCircleProps>): TCircle;
        static createStar(props?: Partial<TStarProps>): TStar
        static createPath(props?: Partial<TPathProps>): TPath
    }

    interface MouseEvent {
        x: number;
        y: number;
        alt: boolean;
        ctrl: boolean;
        shift: boolean;
        cmd: boolean;
        stopPropagation(): void;
    }

    // interface AnimationConstructor {
    //     new(element:TPath, a:number);
    //     new(element:TRectangle, a:MouseEvent);
    // }

    // const Animation:AnimationConstructor;

    type EventCallback<T> = (e?: T) => boolean | void | Promise<boolean | void>;
    type MouseEventCallback = EventCallback<MouseEvent>;

    interface MouseEventHandler {
        onclick: MouseEventCallback;
        onmousedown: MouseEventCallback;
        onmouseup: MouseEventCallback;
        onmousemove: MouseEventCallback;
        onmouseenter: MouseEventCallback;
        onmouseleave: MouseEventCallback;
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

    type PrimitiveType = string | number | boolean;

    type DataBag = PrimitiveType | { [key: string]: PrimitiveType | DataBag };

    /*
    * Navigation controller
    */
    interface INavigationController {
        navigateTo(artboard: ArtboardNames, animationOptions?: INavigationAnimationOptions, data?: DataBag)
        navigateBack();
    }
}