import { IUIElement } from "carbon-model";
import { IContext, RenderEnvironment, RenderFlags, IRect } from "carbon-core";
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
    private _applyMatrix:boolean = true;

    private _contextDimensions: any;

    reset() {
        this.element = null;
        this.context = null;
        this.environment = null;
        this.startTime = 0;
        this.operations = [];
        this.useTempBuffer = false;
        this.useCache = false;
        this._applyMatrix = true;
    }

    applyMatrix(value) {
        if(arguments.length > 0) {
            this._applyMatrix = value;
        }

        return this._applyMatrix;
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
        var cacheItem;
        var draftApproximation = false;
        if (this.useCache) {
            cacheItem = ContextCacheManager.getCacheItem(this.element, this.environment.scale);

            if (cacheItem && cacheItem.scale !== this.environment.scale) {
                if (!(this.environment.flags & RenderFlags.Final)) {
                    draftApproximation = true;
                } else {
                    cacheItem = null;
                }
            }
        }

        if (!cacheItem) {
            if (this.useCache) {
                context = RenderPipeline.getBufferedContext(this.element, this.environment, true);
                // debug("caching %s", this.element.name());
                justCached = true;

                environment = Object.assign({}, environment, {
                    flags: (environment.flags | RenderFlags.DisableCaching) & ~RenderFlags.CheckViewport
                });
            } else if (this.useTempBuffer) {
                context = RenderPipeline.getBufferedContext(this.element, this.environment, (environment.flags & RenderFlags.DisableCaching));
                // debug("caching %s", this.element.name());
            }

            this.startTime = performance.now();

            for (var operation of this.operations) {
                if (operation.type === 'out') {
                    context.save();
                    this._applyMatrix && this.element.applyViewMatrix(context);
                    operation.callback(context, environment);
                    context.restore();
                } else if (operation.type === 'outBuffered') {
                    var tmpContext = RenderPipeline.getBufferedContext(this.element, this.environment, this.useCache || (environment.flags & RenderFlags.DisableCaching));
                    tmpContext.save();
                    this.element.applyViewMatrix(tmpContext);
                    operation.callback(tmpContext, environment);

                    this.mergeContexts(context, tmpContext);

                    tmpContext.restore();
                    ContextPool.releaseContext(tmpContext);
                }
            }

            if (this.useCache) {
                ContextCacheManager.addCacheItem(this.element, context, this.environment.scale);
            }
        } else {
            context = cacheItem.ref.value.value;
        }

        if (this.useTempBuffer || this.useCache) {
            if (this.useCache) {
                var box = RenderPipeline.getContextDimensions(this.element, environment, true, true);
                context.relativeOffsetX = -box.x * environment.contextScale;
                context.relativeOffsetY = -box.y * environment.contextScale;
            }
            if (draftApproximation) {
                let box = RenderPipeline.getCacheRectGlobal(this.element);
                let w = box.width
                let h = box.height;

                this.context.drawImage(context.canvas, 0, 0, context.width, context.height, box.x, box.y, w, h);
            }
            else {
                this.mergeContexts(this.context, context);
            }

            if (!this.useCache) {
                ContextPool.releaseContext(context);
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

    private static getCacheRectGlobal(element) {
        let bbox = element.getBoundingBoxGlobal();
        let clippingRect = bbox;
        clippingRect = element.expandRectWithBorder(clippingRect);

        if (element.props.hitTestBox) {
            var rect = Rect.allocateFromRect(element.props.hitTestBox);
            let gm = element.globalViewMatrix();
            rect.x += gm.tx;
            rect.y += gm.ty;

            clippingRect = rect.combine(clippingRect);
            rect.free();
        }

        return clippingRect;
    }

    private static getContextDimensions(element, environment: RenderEnvironment, forCache: boolean, global = false) {
        let clippingRect = RenderPipeline.getCacheRectGlobal(element);

        var p1 = environment.pageMatrix.transformPoint2(clippingRect.x, clippingRect.y);
        var p2 = environment.pageMatrix.transformPoint2(clippingRect.x + clippingRect.width, clippingRect.y + clippingRect.height);
        p1.x = 0 | p1.x;// * environment.contextScale;
        p1.y = 0 | p1.y;// * environment.contextScale;

        if (!forCache) {
            p1.x = Math.max(0, p1.x);
            p1.y = Math.max(0, p1.y);
        }

        p2.x = 0 | p2.x + .5;
        p2.y = 0 | p2.y + .5;
        var sw = (p2.x - p1.x);
        var sh = (p2.y - p1.y);

        sw = Math.max(sw, 1);
        sh = Math.max(sh, 1);

        var res = { x: p1.x, y: p1.y, w: sw, h: sh, sx: clippingRect.x, sy: clippingRect.y }

        return res;
    }

    private static getBufferedContext(element, environment: RenderEnvironment, forceSize) {
        var box = RenderPipeline.getContextDimensions(element, environment, forceSize, true);

        var offContext = ContextPool.getContext(box.w, box.h, environment.contextScale, forceSize);
        offContext.clear();
        offContext.relativeOffsetX = -box.x * environment.contextScale;
        offContext.relativeOffsetY = -box.y * environment.contextScale;

        offContext.resetTransform();
        environment.setupContext(offContext);

        return offContext;
    }

    static createFor(element, context, environment: RenderEnvironment): RenderPipeline {
        var pipeline = objectPool.allocate();

        pipeline.element = element;
        pipeline.context = context;
        pipeline.environment = environment;
        pipeline.startTime = performance.now();
        let box = RenderPipeline.getContextDimensions(element, environment, true);

        pipeline.useCache = (element.allowCaching() && ContextCacheManager.shouldCache(element, box.w * box.h * 4 * environment.contextScale * environment.contextScale, element.runtimeProps.lrt));

        return pipeline;
    }
}