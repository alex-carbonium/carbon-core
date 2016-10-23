export default class PixelGrid {
    constructor(view) {
        this.view = view;
        this.clean = true;
    }

    updateGrid() {
        var view = this.view;
        if (!view.middleContext) {
            return;
        }
        var scale = view.scale();
        if (scale !== this.scale || view.scrollX() !== this.scrollX || view.scrollY() !== this.scrollY) {
            if (scale > 4) {
                this.render();
            } else if (!this.clean) {
                this.clear();
            }

            this.scale = scale;
            this.scrollX = view.scrollX();
            this.scrollY = view.scrollY();
        }
    }

    clear() {
        this.clean = true;
        if (!this.view.middleContext) {
            return;
        }
        var context = this.view.middleContext;
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    }

    render() {
        var d = this.view.scale();
        var context = this.view.middleContext;
        var w = context.canvas.width;
        var h = context.canvas.height;
        this.clear();
        context.save();
        context.beginPath();

        var di = d;
        d *= this.view.contextScale;
        for (var i = (di - this.view.scrollX() % di) * this.view.contextScale; i < w; i += d) {
            context.moveTo(0 | i + 0.5, 0);
            context.lineTo(0 | i + 0.5, h);
        }

        for (var i = (di - this.view.scrollY() % di) * this.view.contextScale; i < h; i += d) {
            context.moveTo(0, 0 | i + 0.5);
            context.lineTo(w, 0 | i + 0.5);
        }

        context.strokeStyle = 'rgba(70,70,70, 0.2)';
        context.stroke();
        context.restore();

        this.clean = false;
    }
}