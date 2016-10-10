define(["framework/Layer"], function (Layer) {
    var fwk = sketch.framework;

    var elementCache = {};

    function renderTree(node, parentHtmlElement){
        var element;
        if (node.x === null) return;
        var borderWidth = (node.borderWidth || 1),
            borderWidth2 = (borderWidth / 2),
            scale = Environment.view.scale(),
            x = ~~(node.x * scale - borderWidth2),
            y = ~~(node.y * scale - borderWidth2),
            width = ~~(node.width),
            height = ~~(node.height),
            id = node.meta ? node.meta.id : 0;

        switch (node.type){
            case 'rect':
                var cacheItem = elementCache[id];
                if (!cacheItem || !id){
                    element = $('<div></div>');
                    element.css({
                        "position": 'absolute',
                        "display": 'block'
                    });
                    if (id){
                        elementCache[id] = {
                            item: element
                        };
                    }
                } else{
                    element = cacheItem.item;
                }

                element.css({
                    "width": width + 'px',
                    "height": height + 'px',
                    "left": x + 'px',
                    "top": y + 'px'
                });
                if (node.borderColor){
                    element.css({"border-color": node.borderColor,
                        "border-width": borderWidth + "px",
                        "border-style": node.dashPattern ? "dashed" : "solid"});
                }
                if (node.backgroundColor){
                    element.css({"background-color": node.backgroundColor});
                }
                break;
            case 'image':
                var cacheItem = elementCache[id];
                if (!cacheItem || !id){
                    element = $('<img>');
                    element.css({
                        "position": 'absolute',
                        "display": 'block'
                    });
                    if (id){
                        elementCache[id] = {
                            item: element
                        };
                    }
                } else{
                    element = cacheItem.item;
                }
                element.css({
                    "width": width + 'px',
                    "height": height + 'px',
                    "left": x + 'px',
                    "top": y + 'px'
                });
                element.attr('src', node.src);

                break;
        }

        if (!cacheItem){
            var children = node.children || [];
            for (var i = 0; i < children.length; ++i){
                renderTree.call(this, children[i], element);
            }
        }

        parentHtmlElement.append(element);
    }

    return klass2('sketch.framework.HtmlLayer', Layer, {
        _constructor : function(){
            this.context = new fwk.ContextSerializer();
            this._panel = $('#htmlLayer');
            this._contextDataTransformer = new fwk.ContextToVectorVisitor(this.context);
        },
        invalidate:function() {
            this.context.clear();
            this.invalidateRequired = true;
            this.draw(this.context);
            this._contextDataTransformer.transformToVectorTree();
            var tree = this.context.getTree();
            var children = tree.children[0].children;
            this._panel.empty();
            for(var i = 0; i < children.length; ++ i){
                renderTree.call(this, children[i], this._panel);
            }
        },
        clear:function(){

        }
    });
});