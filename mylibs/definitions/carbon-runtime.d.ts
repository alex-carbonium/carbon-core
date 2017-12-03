declare module "carbon-runtime" {
    /// <reference path="carbon-runtime-names"/>;
    export type AnimationProps = { [name: string]: number };

    export interface TUIElement {
        readonly name: string;
        x: number;
        y: number;
        width: number;
        height: number;
        visible: boolean;
        angle: number;

        animate(props: AnimationProps, duration?: number, options?: any, progress?: () => void): Promise<void>;
    }

    export interface TSymbol extends TUIElement{
        states:string[];
        currentState:string;
        nextState():boolean;
        prevState():boolean;
    }

    export interface TRectangle extends TUIElement {

    }

    export interface TPath extends TUIElement {

    }

    export interface TArtboard extends MouseEventHandler {
        readonly width: number;
        readonly height: number;
        readonly name: number;
    }

    interface Property<T> {
        get():T;
        set(value:T):void;
    }

    interface IDisposable {
        dispose();
    }

    interface Event<T> {
        registerHandler(callback:(data:DataBag)=>void|Promise<void>):IDisposable;
        raise(data?:DataBag):boolean | void | Promise<boolean | void>;
    }

    class Model {
        static createProperty<T=number|string|DataBag>(getter:()=>T, setter?:(value:T)=>void):Property<T>;
        static createEvent<T=number|string|DataBag>():Event<T>;
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

    interface AnimationConstructor {
        new(element:TPath, a:number);
        new(element:TRectangle, a:MouseEvent);
    }

    const Animation:AnimationConstructor;

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
        navigateTo(artboard: ArtboardNames, animationOptions?: INavigationAnimationOptions, data?:DataBag)
        navigateBack();
    }
}