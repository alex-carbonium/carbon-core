declare module "carbon-runtime" {
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

    export interface TRectangle extends TUIElement {

    }

    export interface TPath extends TUIElement {

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

    interface MouseEventHandler {
        onclick: (e: MouseEvent) => boolean;
        onmousedown: (e: MouseEvent) => boolean;
        onmouseup: (e: MouseEvent) => boolean;
        onmousemove: (e: MouseEvent) => boolean;
        // onmouseenter:(e:MouseEvent)=>boolean;
        // onmouseleave:(e:MouseEvent)=>boolean;
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
        time?: number;
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
}