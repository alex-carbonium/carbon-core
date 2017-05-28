import { IRectData } from "carbon-core";

export function left(outerBox: IRectData, rect: IRectData): number {
    return rect.x - outerBox.x;
}

export function right(outerBox: IRectData, rect: IRectData): number {
    return outerBox.x + outerBox.width - rect.x - rect.width;
}

export function top(outerBox: IRectData, rect: IRectData): number {
    return rect.y - outerBox.y;
}

export function bottom(outerBox: IRectData, rect: IRectData): number {
    return outerBox.y + outerBox.height - rect.y - rect.height;
}