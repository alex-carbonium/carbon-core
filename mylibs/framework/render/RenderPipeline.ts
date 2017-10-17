import { IUIElement } from "carbon-model";
import { IContext, RenderEnvironment, RenderFlags } from "carbon-core";
import ContextPool from "./ContextPool";
import Matrix from "math/matrix";
import { IPooledObject } from "carbon-basics";
import ObjectPool from "../ObjectPool";
import ContextCacheManager from "./ContextCacheManager";
import Rect from "../../math/rect";

var debug = require("../../DebugUtil")("carb:rendercache");

let objectPool = new ObjectPool(() => {
    return new RenderPipeline();
}, 10);

export default class RenderPipeline implements IPooledObject {

    private element: any;
    private context: IContext;
    private environment: RenderEnvironment;

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

    out(callback: (context: IContext, environment: any) => void) {
        this.operations.push({ type: 'out', callback });
    }

    outBuffered(callback: (context: IContext, environment: any) => void) {
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

        this.context.save();
        var context: any = this.context;

        var environment = this.environment;
        var justCached = false;
        if (!this.element.runtimeProps.rc) {
            if (this.useTempBuffer || this.useCache) {
                context = RenderPipeline.getBufferedContext(this.element, this.environment, this.useCache || (environment.flags & RenderFlags.DisableCaching));
                // debug("caching %s", this.element.name());
                justCached = this.useCache;
            }

            if (this.useCache) {
                environment = Object.assign({}, environment, {
                    flags: (environment.flags | RenderFlags.DisableCaching) & ~RenderFlags.CheckViewport
                });
            }

            this.startTime = performance.now();
            for (var operation of this.operations) {
                if (operation.type === 'out') {
                    context.save();
                    operation.callback(context, environment);
                    context.restore();
                } else if (operation.type === 'outBuffered') {
                    var tmpContext = RenderPipeline.getBufferedContext(this.element, this.environment, this.useCache);
                    tmpContext.save();
                    operation.callback(tmpContext, environment);

                    this.mergeContexts(context, tmpContext);

                    tmpContext.restore();
                    ContextPool.releaseContext(tmpContext);
                }
            }

            if (this.useCache) {
                this.element.runtimeProps.rc = context;
            }
        } else {
            context = this.element.runtimeProps.rc;
            this.useCache = true;
        }

        if (this.useTempBuffer || this.useCache) {
            if (this.useCache) {
                var box = RenderPipeline.getContextDimensions(this.element, environment, true);
                context.relativeOffsetX = -box.x;
                context.relativeOffsetY = -box.y;
            }

            this.mergeContexts(this.context, context);
            if (!this.useCache) {
                ContextPool.releaseContext(context);
                this.element.runtimeProps.rc = null;
            }
        }
        this.context.restore();

        var elapsedTime = performance.now() - this.startTime;

        if (!justCached && elapsedTime > this.element.runtimeProps.lrt) {
            // debug("Cache is slower then original %s, new:%s - old:%s", this.element.name(), elapsedTime, this.element.runtimeProps.lrt);
        }

        if (!justCached) {
            this.element.runtimeProps.lrt = elapsedTime;
        }

        objectPool.free(this);
    }

    private static getContextDimensions(element, environment: RenderEnvironment, forCache: boolean) {
        let clippingRect = element.getBoundingBoxGlobal();
        clippingRect = element.expandRectWithBorder(clippingRect);

        if (element.props.hitTestBox) {
            let gm = element.globalViewMatrix();
            var rect = Rect.allocateFromRect(element.props.hitTestBox);
            rect.x += gm.tx;
            rect.y += gm.ty;

            clippingRect = rect.combine(clippingRect);
            rect.free();
        }

        var p1 = environment.pageMatrix.transformPoint2(clippingRect.x, clippingRect.y);
        var p2 = environment.pageMatrix.transformPoint2(clippingRect.x + clippingRect.width, clippingRect.y + clippingRect.height);
        p1.x = 0 | p1.x * environment.contextScale;
        p1.y = 0 | p1.y * environment.contextScale;

        if (!forCache) {
            p1.x = Math.max(0, p1.x);
            p1.y = Math.max(0, p1.y);
        }

        p2.x = 0 | p2.x * environment.contextScale + .5;
        p2.y = 0 | p2.y * environment.contextScale + .5;
        var sw = (p2.x - p1.x);
        var sh = (p2.y - p1.y);

        sw = Math.max(sw, 1);
        sh = Math.max(sh, 1);

        var res = { x: p1.x, y: p1.y, w: sw, h: sh, sx: clippingRect.x, sy: clippingRect.y }

        return res;
    }

    private static getBufferedContext(element, environment: RenderEnvironment, forceSize) {
        var box = RenderPipeline.getContextDimensions(element, environment, forceSize);

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

    static createFor(element, context, environment: RenderEnvironment): RenderPipeline {
        var pipeline = objectPool.allocate();

        pipeline.element = element;
        pipeline.context = context;
        pipeline.environment = environment;
        pipeline.startTime = performance.now();
        let box = element.getBoundingBox();

        pipeline.useCache = element.hasCachedRender() || (element.allowCaching() && ContextCacheManager.shouldCache(element, box.width * box.height, element.runtimeProps.lrt));

        return pipeline;
    }
}