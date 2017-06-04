import { IMatrix } from "carbon-geometry";
import { IView } from "carbon-core";

declare module "carbon-rendering" {
    export interface IContext {
        font: string;
        strokeStyle: string;
        fillStyle: string;
        lineWidth: number;
        globalAlpha: number;

        translate(x: number, y: number): void;
        rotate(radians: number): void;

        moveTo(x: number, y: number): void;
        lineTo(x: number, y: number): void;
        circle(xc: number, yc: number, r: number): void;
        circlePath(xc: number, yc: number, r: number): void;

        beginPath(): void;
        closePath(): void;

        fillRect(x: number, y: number, width: number, height: number): void;
        fillText(text: string, x: number, y: number): void;
        stroke(): void;
        fill(): void;

        save(): void;
        restore(): void;
    }

    export interface IRenderingEnvironment {
        contextScale: number;
        finalRender: boolean;
        layer: any;
        pageMatrix: IMatrix;
        setupContext: (context: IContext) => void;
        showFrames: boolean;
        view: IView;
    }
}