import UIElement from "framework/UIElement";
import ResizeDimension from "framework/ResizeDimension";
import PropertyMetadata from "framework/PropertyMetadata";
import Brush from "framework/Brush";
import StrokePosition from "framework/StrokePosition";
import ContextPool from "framework/render/ContextPool";

class Shape extends UIElement {

    mode(value) {
        return this.field("_mode", value, "resize");
    }

    closed() {
        return true;
    }

    _renderDraft(context, w, h) {
        var borderBrush = this.borderBrush();

        this.drawPath(context, w, h);
        Brush.fill(this.backgroundBrush(), context, 0, 0, w, h);
        if (!borderBrush || !borderBrush.type || !borderBrush.strokePosition) {

            Brush.stroke(borderBrush, context, 0, 0, w, h);
        } else if (borderBrush.strokePosition === StrokePosition.Inside) {
            context.clip();
            Brush.stroke(borderBrush, context, 0, 0, w, h, 2);
        } else if (borderBrush.strokePosition === StrokePosition.Outside) {
            context.beginPath();
            context.rect(2 * w, -h, -3 * w, 3 * h);
            this.drawPath(context, w, h);
            context.clip();
            context.beginPath();
            this.drawPath(context, w, h);
            Brush.stroke(borderBrush, context, 0, 0, w, h, 2);
        }
    }

    _renderFinal(context, w, h, environment) {
        var borderBrush = this.borderBrush();

        context.beginPath();
        this.drawPath(context, w, h);
        Brush.fill(this.backgroundBrush(), context, 0, 0, w, h);
        if (!borderBrush || !borderBrush.type || !borderBrush.strokePosition || !this.closed()) {
            Brush.stroke(borderBrush, context, 0, 0, w, h);
        } else {
            var clipingRect = this.getBoundingBoxGlobal(false, true);
            if(!environment.offscreen) {
                var p1 = environment.pageMatrix.transformPoint2(clipingRect.x, clipingRect.y);
                var p2 = environment.pageMatrix.transformPoint2(clipingRect.x + clipingRect.width, clipingRect.y + clipingRect.height);
                p1.x = Math.max(0, 0 | p1.x * environment.contextScale);
                p1.y = Math.max(0, 0 | p1.y * environment.contextScale);
                p2.x = 0 | p2.x * environment.contextScale + .5;
                p2.y = 0 | p2.y * environment.contextScale + .5;
                var sw = (p2.x - p1.x);
                var sh = (p2.y - p1.y);
            } else {
                sw = 0 | clipingRect.width * environment.contextScale + .5;
                sh = 0 | clipingRect.height * environment.contextScale + .5;
                p1 = {x:0, y:0};
            }

            var offContext = ContextPool.getContext(sw, sh, environment.contextScale);
            offContext.clearRect(0, 0, sw, sh);
            offContext.relativeOffsetX = -p1.x;
            offContext.relativeOffsetY = -p1.y;

            offContext.save();
            offContext.translate(-p1.x, -p1.y);
            environment.setupContext(offContext);

            if(!environment.offscreen) {
                this.globalViewMatrix().applyToContext(offContext);
            }

            offContext.beginPath();
            this.drawPath(offContext, w, h);

            Brush.stroke(borderBrush, offContext, 0, 0, w, h, 2);
            if (borderBrush.strokePosition === StrokePosition.Inside) {
                offContext.globalCompositeOperation = "destination-in";
            } else {
                offContext.globalCompositeOperation = "destination-out";
            }
            offContext.fillStyle = "black";
            offContext.fill();

            if(!environment.offscreen) {
                context.resetTransform();
            }

            context.drawImage(offContext.canvas, p1.x, p1.y);

            offContext.restore();

            ContextPool.releaseContext(offContext);
        }
    }

    drawSelf(context, w, h, environment) {
//                var that = this;
//                var shadow = this.shadow();
//
//                shadow.apply(context, function(context){
//                    that.drawShape(context, x, y, w, h);
//                });

        context.save();

        var dashPattern = this.dashPattern();
        if (dashPattern) {
            context.setLineDash(dashPattern);
        }
        // context.lineWidth = this.borderWidth();

        if (environment.finalRender) {
            this._renderFinal(context, w, h, environment);
        } else {
            this._renderDraft(context, w, h);
        }

        context.restore();
    }

    resizeDimensions() {
        return (this.mode() === "resize" ? ResizeDimension.Both : ResizeDimension.None);
    }


}

PropertyMetadata.registerForType(Shape, {
    borderBrush: {
        displayName: "Stroke",
        type: "stroke",
        defaultValue: Brush.Black
    }
});

export default Shape;
