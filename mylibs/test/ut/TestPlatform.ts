import { BasePlatform } from "carbon-core";

export default class TestPlatform extends BasePlatform {
    createCanvas() {
        this.canvas = document.createElement("canvas");
        this.context = this.canvas.getContext("2d");
    }
    platformSpecificRunCode() {
    }
    ensureCanvasSize() {
    }
    toggleVisualElements() {
    }
}