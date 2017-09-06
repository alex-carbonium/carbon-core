import All from "platform/All";

export default class TestPlatform extends All {
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