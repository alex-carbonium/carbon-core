import { IRenderer, IUIElement, RenderEnvironment, RenderFlags, IRect, IContext, IMatrix } from "carbon-core";
import ContextPool from "./ContextPool";
import Matrix from "math/matrix";
import RenderPipeline from "./RenderPipeline";
import Page from "../Page";
import Rect from "../../math/rect";

/**
 * Renderer object to expose in API.
 */
export class Renderer implements IRenderer {
    contextPool = ContextPool;

    elementToDataUrl(element: IUIElement, contextScale = 1) {
        let box = this.getBoundingBox(element);

        let context = ContextPool.getContext(box.width, box.height, contextScale, true);

        this.elementToContext(element, context, contextScale);
        let data = context.canvas.toDataURL();

        ContextPool.releaseContext(context);

        return data;
    }

    elementToDataUrlScaled(element: IUIElement, bounds: IRect, contextScale: number): string {
        let box = this.getBoundingBox(element);
        let fit = box.fit(bounds);

        let context = ContextPool.getContext(fit.width, fit.height, contextScale, true);

        let matrix = Matrix.allocate();
        matrix.scale(fit.width/box.width, fit.height/box.height);
        this.elementToContext(element, context, contextScale, matrix);
        let data = context.canvas.toDataURL();
        matrix.free();

        ContextPool.releaseContext(context);

        return data;
    }

    elementToContextFromPool(element: IUIElement, contextScale = 1, scaleX = 1, scaleY = 1) {
        let box = this.getBoundingBox(element);

        let context = ContextPool.getContext(box.width * scaleX, box.height * scaleY, contextScale, true);

        let matrix = Matrix.allocate();
        matrix.scale(scaleX, scaleY);
        this.elementToContext(element, context, contextScale, matrix);
        matrix.free();

        return context;
    }

    elementToContext(element: IUIElement, context: IContext, contextScale = 1, contextMatrix?: IMatrix) {
        let box = this.getBoundingBox(element);
        let pageMatrix = Matrix.allocate();
        pageMatrix.translate(-box.x, -box.y);

        if (contextMatrix) {
            pageMatrix.prepend(contextMatrix);
        }

        let env: RenderEnvironment = {
            flags: RenderFlags.Final | RenderFlags.Offscreen | RenderFlags.DisableCaching,
            setupContext: (ctx) => {
                ctx.scale(contextScale, contextScale);
                pageMatrix.applyToContext(ctx);
            },
            pageMatrix: pageMatrix,
            contextScale: contextScale,
            scale: 1,
            fill: null,
            stroke: null
        };

        context.save();
        context.scale(contextScale, contextScale);
        pageMatrix.applyToContext(context);

        var pipeline = RenderPipeline.createFor(element, context, env);
        pipeline.disableCache();
        pipeline.out(c => {
            let rect = element.boundaryRect();
            element.drawSelf(c, rect.width, rect.height, env);
        });
        pipeline.done();

        pageMatrix.free();
        context.restore();
    }

    private getBoundingBox(element: IUIElement) {
        if (element instanceof Page) {
            //TODO: bounding box of page is rect.max, so taking boundary rect, this probably has to be fixed
            let rect = element.boundaryRect();
            return Rect.fromSize(rect.width, rect.height);
        }
        let box = element.getBoundingBoxGlobal();
        box = element.expandRectWithBorder(box);
        box.width = Math.max(1, box.width) | 0;
        box.height = Math.max(1, box.height) | 0;
        return box;
    }
}

export const renderer = new Renderer();