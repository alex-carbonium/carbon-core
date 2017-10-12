import { IUIElement } from "carbon-model";
import { IContext, RenderEnvironment, RenderFlags } from "carbon-core";
import ContextPool from "./ContextPool";
import Matrix from "math/matrix";
import { IPooledObject } from "carbon-basics";
import ObjectPool from "../ObjectPool";

let objectPool = new ObjectPool(()=>{
    return new RenderPipeline();
}, 10);

export default class RenderPipeline implements IPooledObject {

    private element: any;
    private context: IContext;
    private environment: RenderEnvironment;

    private operations: any[] = [];
    private useTempBuffer: boolean = false;

    private startTime: number;

    reset() {
        this.element = null;
        this.context = null;
        this.environment = null;
        this.startTime = 0;
        this.operations = [];
        this.useTempBuffer = false;
    }

    free() {
        this.reset();
    }

    out(callback: (context: IContext) => void) {
        this.operations.push({ type: 'out', callback });
    }

    outBuffered(callback: (context: IContext) => void) {
        this.operations.push({ type: 'outBuffered', callback });
    }

    bufferOutput() {
        this.useTempBuffer = true;
    }

    private mergeContexts(dest, source) {
        var sx = -(source._relativeOffsetX || 0);
        var sy = -(source._relativeOffsetY || 0);

        dest.save();
        // resetTransform set relativeOffset on destinantion context
        dest.resetTransform();
        dest.drawImage(source.canvas, sx, sy);
        dest.restore();
    }

    done() {
        var ellapsedTime = performance.now() - this.startTime;

        this.context.save();
        var context: any = this.context;
        if (this.useTempBuffer) {
            context = RenderPipeline.getBufferedContext(this.element, this.environment);
        }

        for (var operation of this.operations) {
            if (operation.type === 'out') {
                context.save();
                operation.callback(context);
                context.restore();
            } else if (operation.type === 'outBuffered') {
                var tmpContext = RenderPipeline.getBufferedContext(this.element, this.environment);
                tmpContext.save();
                operation.callback(tmpContext);

                this.mergeContexts(context, tmpContext);

                tmpContext.restore();
                ContextPool.releaseContext(tmpContext);
            }
        }

        if (this.useTempBuffer) {
            this.mergeContexts(this.context, context);
            ContextPool.releaseContext(context);
        }
        this.context.restore();

        objectPool.free(this);
    }

    private static getContextDimensions(element, environment: RenderEnvironment) {
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

        return { x: p1.x, y: p1.y, w: sw, h: sh, sx: clippingRect.x, sy:clippingRect.y }
    }

    private static getBufferedContext(element, environment: RenderEnvironment, forceSize = false) {
        var box = RenderPipeline.getContextDimensions(element, environment);

        var offContext = ContextPool.getContext(box.w, box.h, environment.contextScale, forceSize);
        offContext.clear();
        offContext.relativeOffsetX = -box.x;
        offContext.relativeOffsetY = -box.y;

        offContext.translate(-box.x, -box.y);

        environment.setupContext(offContext);

        if(element.shouldApplyViewMatrix()) {
            element.applyViewMatrix(offContext);
        }

        return offContext;
    }

    static createFor(element, context, environment: RenderEnvironment): RenderPipeline {
        var pipeline = objectPool.allocate();

        pipeline.element = element;
        pipeline.context = context;
        pipeline.environment = environment;
        pipeline.startTime = performance.now();

        return pipeline;
    }
}