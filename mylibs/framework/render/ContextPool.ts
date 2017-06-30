// @flow
import Context from "./Context";

var contextPool : Array<Context> = [];

export default {
    getContext(width: number, height: number, scale: number, forceExactSize?:boolean) : Context{
        if(forceExactSize) {
            width = width * scale;
            height = height * scale;
        } else {
            var size = App.Current.viewportSize();
            width = Math.min(size.width * scale, width * scale);
            height = Math.min(size.height * scale, height * scale);
        }
        if (contextPool.length === 0) {
            let context = new Context();
            context.width = width;
            context.height = height;
            context.relativeOffsetX = 0;
            context.relativeOffsetY = 0;
            context.resetTransform();
            return context;
        } else {
            for (var i = 0; i < contextPool.length; ++i) {
                let context = contextPool[i];
                if (context.width >= width && context.height >= height) {
                    contextPool.splice(i, 1);
                    context.relativeOffsetX = 0;
                    context.relativeOffsetY = 0;

                    if(forceExactSize){
                        context.width = width;
                        context.height = height;
                    }

                    context.resetTransform();
                    return context;
                }
            }

            var context = contextPool.pop();
            context.width = width;
            context.height = height;
            context.relativeOffsetX = 0;
            context.relativeOffsetY = 0;
            context.resetTransform();
            return context;
        }
    },

    releaseContext(contextMetadata : Context){
        contextPool.push(contextMetadata);
    }
}
