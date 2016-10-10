import Context from "./Context";

var contextPool = [];

export default {
    getContext(width, height, scale){
        var size = App.Current.viewportSize();
        width = Math.min(size.width * scale, width);
        height = Math.min(size.height * scale, height);
        if(contextPool.length === 0){
            var context = new Context();
            context.width = width;
            context.height = height;
            return  context;
        } else {
            for(var i = 0; i < contextPool.length; ++i) {
                var context = contextPool[i];
                if(context.width >= width && context.height >= height){
                    contextPool.splice(i, 1);
                    return context;
                }
            }

            var context = contextPool.pop();
            context.width = width;
            context.height = height;
            return context;
        }
    },

    releaseContext(contextMetadata){
        contextPool.push(contextMetadata);
    }
}
