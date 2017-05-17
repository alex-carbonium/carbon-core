import All from "platform/All";

export default class TestPlatform extends All {
    viewportSize() {
        return { width: 3000, height: 2000, x: 0, y: 0 };
    }
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