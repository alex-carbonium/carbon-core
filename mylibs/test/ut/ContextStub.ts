import { IContext, ContextType, RenderEnvironment } from "carbon-core";

export default class ContextStub implements IContext {
    type = ContextType.Content;

    width: number;
    height: number;
    canvas: HTMLCanvasElement;
    font: string;
    strokeStyle: string;
    fillStyle: string;
    lineWidth: number;
    globalAlpha: number;
    filter: string;
    globalCompositeOperation: string;
    saveCount = 0;

    setLineDash(v) {

    }

    beginElement(element: any, environment: RenderEnvironment): boolean {
        return true;
    }
    endElement(element: any): void {
    }

    rect(x: number, y: number, width: number, height: number) {

    }
    clear() {
    }
    clearRect(x: number, y: number, width: number, height: number) {

    }
    translate(x: number, y: number): void {

    }
    scale(x: number, y: number) {

    }
    rotate(radians: number): void {

    }
    moveTo(x: number, y: number): void {

    }
    lineTo(x: number, y: number): void {

    }
    circle(xc: number, yc: number, r: number): void {

    }
    circlePath(xc: number, yc: number, r: number): void {

    }
    linePath(x1, y1, x2, y2) {

    }
    rectPath(x: any, y: any, width: any, height: any, crazySupported: any, reverse: any): void {
    }
    beginPath(): void {

    }
    closePath(): void {

    }
    fillRect(x: number, y: number, width: number, height: number): void {

    }
    fillText(text: string, x: number, y: number): void {

    }
    stroke(): void {

    }
    fill(): void {

    }
    fill2(): void {

    }
    transform(m11, m12, m21, m22, dx, dy) {

    }
    resetTransform(): void {

    }
    drawImage(img_elem: any, dx_or_sx?: number, dy_or_sy?: number, dw_or_sw?: number, dh_or_sh?: number, dx?: number, dy?: number, dw?: number, dh?: number) {

    }
    clip(): void {

    }
    save(): void {

    }
    restore(): void {

    }

    logToConsole() {
    }
}