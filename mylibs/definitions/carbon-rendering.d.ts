declare module "carbon-rendering" {
    import { IMatrix, IRect } from "carbon-geometry";
    import { IUIElement, Brush } from "carbon-core";

    export const enum ContextType {
        Content,
        Isolation,
        Interaction,
        Grid,
        Cache
    }

    export interface IContext {
        type: ContextType;

        width: number;
        height: number;
        canvas: HTMLCanvasElement;

        font: string;
        strokeStyle: string;
        fillStyle: string;
        lineWidth: number;
        globalAlpha: number;
        filter: string;
        globalCompositeOperation:string;

        readonly saveCount: number;

        beginElement(element, environment: RenderEnvironment): boolean;
        endElement(element): void;

        rect(x: number, y: number, width: number, height: number);
        clearRect(x: number, y: number, width: number, height: number);
        clear();

        translate(x: number, y: number): void;
        scale(x: number, y: number);
        rotate(radians: number): void;

        setLineDash(dash:number[]):void;

        moveTo(x: number, y: number): void;
        lineTo(x: number, y: number): void;
        circle(xc: number, yc: number, r: number): void;
        circlePath(xc: number, yc: number, r: number): void;
        rectPath(x, y, width, height, crazySupported, reverse): void;
        linePath(x1, y1, x2, y2): void;

        beginPath(): void;
        closePath(): void;

        fillRect(x: number, y: number, width: number, height: number): void;
        fillText(text: string, x: number, y: number): void;
        stroke(): void;
        fill(): void;
        fill2(): void;

        transform(m11, m12, m21, m22, dx, dy);
        resetTransform():void;
        drawImage(img_elem, dx_or_sx?:number, dy_or_sy?:number, dw_or_sw?:number, dh_or_sh?:number, dx?:number, dy?:number, dw?:number, dh?:number);

        clip(): void;

        save(): void;
        restore(): void;

        logToConsole();
    }

    interface IContextConstructor {
        new(type: ContextType, canvas: HTMLCanvasElement): IContext;
    }

    export const Context: IContextConstructor;

    export const enum RenderFlags {
        None = 0,
        Final = 1 << 0,
        UseParentClipping = 1 << 1,
        ArtboardFill = 1 << 2,
        ShowFrames = 1 << 3,
        Offscreen = 1 << 4,
        CheckViewport = 1 << 5,
        DisableCaching = 1 << 6,
        Preview = 1 << 7,
        Default = Final | ArtboardFill | UseParentClipping | CheckViewport
    }

    export type RenderEnvironment = {
        contextScale: number;
        scale: number;
        pageMatrix: IMatrix;
        scaleMatrix: IMatrix;
        flags: RenderFlags;
        fill: Brush | null;
        stroke: Brush | null;
        //TODO: check if this can be removed or called on some other class
        setupContext: (context: IContext) => void;
    }

    export interface IContextPool {
        getContext(width: number, height: number, scale: number, forceExactSize?:boolean) : IContext;
        releaseContext(context: IContext);
    }

    export interface IRenderer {
        readonly contextPool: IContextPool;
        elementToDataUrl(element: IUIElement, contextScale: number): string;
        elementToDataUrlScaled(element: IUIElement, bounds: IRect, contextScale: number): string;
        elementToContext(element: IUIElement, context: IContext, contextScale: number, contextMatrix?: IMatrix);
    }

    export const renderer: IRenderer;
}