import { IUIElement } from "carbon-model";
import { IContext } from "carbon-core";
import ContextPool from "./ContextPool";

export default class RenderPipeline {

    private element: any;
    private context: IContext;
    private environment: any;

    private operations: any[] = [];
    private useTempBuffer: boolean = false;

    out(callback: (context: IContext) => void) {
        this.operations.push({ type: 'out', callback });
    }

    outBuffered(callback: (context: IContext) => void) {
        this.operations.push({ type: 'outBuffered', callback });
    }

    bufferOutput() {
        this.useTempBuffer = true;
    }

    done() {
        var context:any = this.context;
        this.context.save();
        if (this.useTempBuffer) {
            context = this.getBufferedContext();
        }

        for (var operation of this.operations) {
            this.context.save();
            if (operation.type === 'out') {
                operation.callback(context);
            } else if (operation.type === 'outBuffered') {
                var tmpContext = this.getBufferedContext();
                tmpContext.save();
                operation.callback(tmpContext);

                context.resetTransform();

                if (this.useTempBuffer) {
                    context.drawImage(tmpContext.canvas, 0, 0);
                } else {
                    context.drawImage(tmpContext.canvas, -tmpContext._relativeOffsetX, -tmpContext._relativeOffsetY);
                }

                tmpContext.restore();
                ContextPool.releaseContext(tmpContext);
            }
            this.context.restore();
        }

        if (this.useTempBuffer) {
            this.context.resetTransform();
            var x = (this.context as any)._relativeOffsetX || 0;
            var y = (this.context as any)._relativeOffsetY || 0;
            this.context.drawImage(context.canvas, x-context._relativeOffsetX, y-context._relativeOffsetY);
            ContextPool.releaseContext(context);
        }
        this.context.restore();
        this.operations = [];
    }

    private getBufferedContext() {
        let element = this.element;
        let environment = this.environment;
        let clippingRect = element.getBoundingBoxGlobal();
        clippingRect = element.expandRectWithBorder(clippingRect);

        var p1 = environment.pageMatrix.transformPoint2(clippingRect.x, clippingRect.y);
        var p2 = environment.pageMatrix.transformPoint2(clippingRect.x + clippingRect.width, clippingRect.y + clippingRect.height);
        p1.x = Math.max(0, 0 | p1.x * environment.contextScale);
        p1.y = Math.max(0, 0 | p1.y * environment.contextScale);
        p2.x = 0 | p2.x * environment.contextScale + .5;
        p2.y = 0 | p2.y * environment.contextScale + .5;
        var sw = (p2.x - p1.x);
        var sh = (p2.y - p1.y);

        sw = Math.max(sw, 1);
        sh = Math.max(sh, 1);

        var offContext = ContextPool.getContext(sw, sh, environment.contextScale);
        offContext.clearRect(0, 0, sw, sh);
        offContext.relativeOffsetX = -p1.x;
        offContext.relativeOffsetY = -p1.y;

        offContext.save();
        offContext.translate(-p1.x, -p1.y);
        environment.setupContext(offContext);

        element.applyViewMatrix(offContext);

        return offContext;
    }

    static createFor(element, context, environment): RenderPipeline {
        var pipeline = new RenderPipeline();
        pipeline.element = element;
        pipeline.context = context;
        pipeline.environment = environment;
        // TODO: use object pool
        return pipeline;
    }
}