define(function() {
    klass2("sketch.framework.ContextDataVisitor", null, {
        _constructor:function(contextData) {
            this._contextData = contextData;
        },
        visit:function(callback){
            var elements = [];
            var children = this._contextData.children;
            for(var i = children.length -1; i >=0 ; --i){
                elements.push(children[i]);
            }

            while(elements.length>0){
                var element = elements.pop();
                children = element.children;
                for(var i = children.length -1; i >=0 ; --i){
                    elements.push(children[i]);
                }
                callback(element);
            }

        }
    });
});