declare module "carbon-rendering"{
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
        beginPath(): void;
        closePath(): void;

        fillRect(x: number, y: number, width: number, height: number): void;
        fillText(text: string, x: number, y: number): void;
        stroke(): void;

        save(): void;
        restore(): void;
    }
}