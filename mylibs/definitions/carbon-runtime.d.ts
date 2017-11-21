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

}