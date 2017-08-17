import { IMatrix } from "carbon-geometry";
import { IView } from "carbon-core";

declare module "carbon-rendering" {
    export interface IContext {
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

        beginElement(element): boolean;
        endElement(element): void;

        rect(x: number, y: number, width: number, height: number);
        clearRect(x: number, y: number, width: number, height: number);

        translate(x: number, y: number): void;
        scale(x: number, y: number);
        rotate(radians: number): void;

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

        resetTransform():void;
        drawImage(img_elem, dx_or_sx?:number, dy_or_sy?:number, dw_or_sw?:number, dh_or_sh?:number, dx?:number, dy?:number, dw?:number, dh?:number);

        clip(): void;

        save(): void;
        restore(): void;
    }

    interface IContextConstructor {
        new(canvas: HTMLCanvasElement): IContext;
    }

    export const Context: IContextConstructor;

    export interface IRenderingEnvironment {
        contextScale: number;
        finalRender: boolean;
        layer: any;
        pageMatrix: IMatrix;
        setupContext: (context: IContext) => void;
        showFrames: boolean;
        view: IView;
    }

    export interface IContextPool {
        getContext(width: number, height: number, scale: number, forceExactSize?:boolean) : IContext;
        releaseContext(context: IContext);
    }
}