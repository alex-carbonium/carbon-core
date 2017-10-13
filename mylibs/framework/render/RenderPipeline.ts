import { IUIElement } from "carbon-model";
import { IContext } from "carbon-core";
import ContextPool from "./ContextPool";
import Matrix from "math/matrix";
import { IPooledObject } from "carbon-basics";
import ObjectPool from "../ObjectPool";
import ContextCacheManager from "./ContextCacheManager";

let objectPool = new ObjectPool(() => {
    return new RenderPipeline();
}, 10);

export default class RenderPipeline implements IPooledObject {

    private element: any;
    private context: IContext;
    private environment: any;

    private operations: any[] = [];
    private useTempBuffer: boolean = false;

    private startTime: number;
    private useCache: boolean = false;

    reset() {
        this.element = null;
        this.context = null;
        this.environment = null;
        this.startTime = 0;
        this.operations = [];
        this.useTempBuffer = false;
        this.useCache = false;
    }

    free() {
        this.reset();
    }

    out(callback: (context: IContext, environment:any) => void) {
        this.operations.push({ type: 'out', callback });
    }

    outBuffered(callback: (context: IContext, environment:any) => void) {
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

    disableCache() {
        this.useCache = false;
    }

    done() {
        var ellapsedTime = performance.now() - this.startTime;
        this.element.runtimeProps.lrt = ellapsedTime;

        this.context.save();
        var context: any = this.context;

        if (!this.element.runtimeProps.rc) {
            if (this.useTempBuffer || this.useCache) {
                context = RenderPipeline.getBufferedContext(this.element, this.environment);
            }

            var environment = this.environment;
            if(this.useCache) {
                environment = Object.assign({}, environment, {disableCache:true});
            }

            for (var operation of this.operations) {
                if (operation.type === 'out') {
                    context.save();
                    operation.callback(context, environment);
                    context.restore();
                } else if (operation.type === 'outBuffered') {
                    var tmpContext = RenderPipeline.getBufferedContext(this.element, this.environment);
                    tmpContext.save();
                    operation.callback(tmpContext, environment);

                    this.mergeContexts(context, tmpContext);

                    tmpContext.restore();
                    ContextPool.releaseContext(tmpContext);
                }
            }

            if(this.useCache) {
                this.element.runtimeProps.rc = context;
            }
        } else {
            context = this.element.runtimeProps.rc;
        }

        if (this.useTempBuffer || this.useCache) {
            this.mergeContexts(this.context, context);
            if(!this.useCache) {
                ContextPool.releaseContext(context);
            }
        }
        this.context.restore();

        objectPool.free(this);
    }

    static elementToDataUrl(element, contextScale = 1) {
        let box = element.getBoundingBoxGlobal();
        box = element.expandRectWithBorder(box);
        let pageMatrix = new Matrix(1, 0, 0, 1, -box.x, -box.y);
        let env = {
            finalRender: true, setupContext: (ctx) => {
                ctx.scale(contextScale, contextScale);
                ctx.clear();
                pageMatrix.applyToContext(ctx);
            }, pageMatrix: pageMatrix, contextScale: contextScale, offscreen: true, view: { scale: () => 1, contextScale, focused: () => false }
        };

        box.width = Math.max(1, box.width) | 0;
        box.height = Math.max(1, box.height) | 0;

        let context = ContextPool.getContext(box.width, box.height, contextScale, true);
        context.relativeOffsetX = 0;
        context.relativeOffsetY = 0;

        context.scale(contextScale, contextScale);

        context.clear();
        pageMatrix.applyToContext(context);

        var pipeline = RenderPipeline.createFor(element, context, env);
        pipeline.out(c => {
            element.draw(c, env);
        });
        pipeline.done();
        var data = context.canvas.toDataURL("image/png");

        ContextPool.releaseContext(context);

        return data;
    }

    static elementToContextFromPool(element, contextScale = 1, scaleX = 1, scaleY = 1) {
        let box = element.getBoundingBoxGlobal();
        box = element.expandRectWithBorder(box);
        let pageMatrix = new Matrix(1, 0, 0, 1, -box.x, -box.y);
        let env = {
            finalRender: true, setupContext: (ctx) => {
                ctx.scale(contextScale * scaleX, contextScale * scaleY);
                ctx.clear();
                pageMatrix.applyToContext(ctx);
            }, pageMatrix: pageMatrix, contextScale: contextScale, offscreen: true, view: { scale: () => 1, contextScale, focused: () => false }
        };

        box.width = Math.max(1, box.width) | 0;
        box.height = Math.max(1, box.height) | 0;

        let context = ContextPool.getContext(box.width * scaleX, box.height * scaleY, contextScale, true);
        context.relativeOffsetX = 0;
        context.relativeOffsetY = 0;

        context.scale(contextScale * scaleX, contextScale * scaleY);

        context.clear();
        pageMatrix.applyToContext(context);

        var pipeline = RenderPipeline.createFor(element, context, env);
        pipeline.out(c => {
            element.draw(c, env);
        });
        pipeline.done();

        return context;
    }

    private static getContextDimensions(element, environment) {
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

        return { x: p1.x, y: p1.y, w: sw, h: sh, sx: clippingRect.x, sy: clippingRect.y }
    }

    private static getBufferedContext(element, environment, forceSize = false) {
        var box = RenderPipeline.getContextDimensions(element, environment);

        var offContext = ContextPool.getContext(box.w, box.h, environment.contextScale, forceSize);
        offContext.clear();
        offContext.relativeOffsetX = -box.x;
        offContext.relativeOffsetY = -box.y;

        offContext.translate(-box.x, -box.y);

        environment.setupContext(offContext);

        if (element.shouldApplyViewMatrix()) {
            element.applyViewMatrix(offContext);
        }

        return offContext;
    }

    static createFor(element, context, environment): RenderPipeline {
        var pipeline = objectPool.allocate();

        pipeline.element = element;
        pipeline.context = context;
        pipeline.environment = environment;
        pipeline.startTime = performance.now();
        let box = element.getBoundingBox();

        pipeline.useCache = (element.allowCaching() && ContextCacheManager.shouldCache(box.width * box.height, element.runtimeProps.lrt));

        return pipeline;
    }
}