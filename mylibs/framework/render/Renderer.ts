import { IRenderer, IUIElement, RenderEnvironment, RenderFlags, IRect, IContext } from "carbon-core";
import ContextPool from "./ContextPool";
import Matrix from "math/matrix";
import RenderPipeline from "./RenderPipeline";

/**
 * Renderer object to expose in API.
 */
export class Renderer implements IRenderer {
    contextPool = ContextPool;

    elementToDataUrl(element: IUIElement, contextScale = 1) {
        let box = this.getBoundingBox(element);

        let context = ContextPool.getContext(box.width, box.height, contextScale, true);

        this.elementToContext(element, context, contextScale, 1, 1);
        let data = context.canvas.toDataURL();

        ContextPool.releaseContext(context);

        return data;
    }

    elementToDataUrlScaled(element: IUIElement, bounds: IRect, contextScale: number): string {
        let box = this.getBoundingBox(element);
        let fit = box.fit(bounds);

        let context = ContextPool.getContext(fit.width, fit.height, contextScale, true);

        this.elementToContext(element, context, contextScale, fit.width/box.width, fit.height/box.height);
        let data = context.canvas.toDataURL();

        ContextPool.releaseContext(context);

        return data;
    }

    elementToContextFromPool(element: IUIElement, contextScale = 1, scaleX = 1, scaleY = 1) {
        let box = this.getBoundingBox(element);

        let context = ContextPool.getContext(box.width * scaleX, box.height * scaleY, contextScale, true);

        this.elementToContext(element, context, contextScale, scaleX, scaleY);

        return context;
    }

    elementToContext(element: IUIElement, context: IContext, contextScale = 1, scaleX = 1, scaleY = 1) {
        let box = this.getBoundingBox(element);
        let pageMatrix = new Matrix(1, 0, 0, 1, -box.x, -box.y);
        let env: RenderEnvironment = {
            flags: RenderFlags.Final | RenderFlags.Offscreen,
            setupContext: (ctx) => {
                ctx.scale(contextScale * scaleX, contextScale * scaleY);
                ctx.clear();
                pageMatrix.applyToContext(ctx);
            },
            pageMatrix: pageMatrix,
            contextScale: contextScale,
            scale: 1,
            fill: null,
            stroke: null
        };

        context.save();
        context.scale(contextScale * scaleX, contextScale * scaleY);
        context.clear();
        pageMatrix.applyToContext(context);

        var pipeline = RenderPipeline.createFor(element, context, env);
        pipeline.out(c => {
            element.draw(c, env);
        });
        pipeline.done();
        context.restore();
    }

    private getBoundingBox(element: IUIElement) {
        let box = element.getBoundingBoxGlobal();
        box = element.expandRectWithBorder(box);
        box.width = Math.max(1, box.width) | 0;
        box.height = Math.max(1, box.height) | 0;
        return box;
    }
}

export const renderer = new Renderer();