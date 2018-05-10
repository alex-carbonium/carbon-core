import Invalidate from "framework/Invalidate";
import All from "./All";

export default class Basic extends All {
    canvas:any;
    view:any;

    richUI() {
        return false;
    }

    platformSpecificRunCode() {
    }

    createCanvas() {
        All.prototype.createCanvas.apply(this, arguments);
        this.canvas.style.position = "static";
    }

    detachEvents() {

    }

    attachEvents() {

    }

    ensureCanvasSize() {
        var view = this.view;
        var viewWidth = view.width();
        var viewHeight = view.height();

        if (this.canvas.width !== viewWidth || this.canvas.height !== viewHeight) {
            var oldSize = { width: this.canvas.width, height: this.canvas.height };

            this.canvas.width = viewWidth;
            this.canvas.style.width = viewWidth + "px";

            this.canvas.height = viewHeight;
            this.canvas.style.height = viewHeight + "px";

            Invalidate.request();
        }
    }
}