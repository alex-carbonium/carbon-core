// @flow
import Context from "./Context";
import { IContextPool, ContextType } from "carbon-core";

var contextPool : Array<Context> = [];

class ContextPool implements IContextPool {
    getContext(width: number, height: number, scale: number, forceExactSize?:boolean) : Context{
        if(forceExactSize || true) {
            width = width * scale;
            height = height * scale;
        }
        // TODO: uncoment and check if it is the reason for rendering artifacts
        // else {
        //     var size = Workspace.view.viewportSize();
        //     width = Math.min(size.width * scale, width * scale);
        //     height = Math.min(size.height * scale, height * scale);
        // }

        if (contextPool.length === 0) {
            let context = new Context(ContextType.Cache);
            context.width = width;
            context.height = height;
            context.relativeOffsetX = 0;
            context.relativeOffsetY = 0;
            context.resetTransform();
            context.save();
            return context;
        } else {
            for (var i = 0; i < contextPool.length; ++i) {
                let context = contextPool[i];
                if (context.width >= width && context.height >= height) {
                    contextPool.splice(i, 1);
                    context.relativeOffsetX = 0;
                    context.relativeOffsetY = 0;

                    //if(forceExactSize){
                        context.width = width;
                        context.height = height;
                    //}

                    context.resetTransform();
                    context.save();
                    return context;
                }
            }

            var context = contextPool.pop();
            context.width = width;
            context.height = height;
            context.relativeOffsetX = 0;
            context.relativeOffsetY = 0;
            context.resetTransform();
            context.save();
            return context;
        }
    }

    releaseContext(contextMetadata : Context){
        contextMetadata.restore();
        if(!contextMetadata.isBalancedSaveRestore) {
            throw "Unbalanced save/restore on context"
        }
        contextPool.push(contextMetadata);
    }
}

export default new ContextPool();