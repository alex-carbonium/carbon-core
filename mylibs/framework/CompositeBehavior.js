define(["framework/Behavior"], function(Behavior){
    return klass(Behavior, {
        _constructor: function(behaviors){
            this._behaviors = behaviors;
            for (var i = 0, l = this._behaviors.length; i < l; ++i){
                this._behaviors[i].setParent(this);
            }
        },
        attach: function(container) {
            for (var i = 0, l = this._behaviors.length; i < l; ++i){
                var behavior = this._behaviors[i];
                behavior.assignContainer(container);
            }
            Behavior.prototype.attach.apply(this, arguments);
        },
        apply: function(elements){
            for (var i = 0, l = this._behaviors.length; i < l; ++i){
                var behavior = this._behaviors[i];
                behavior.apply(elements);

                //elements might be disposed by behaviors
                var refinedElements = [];
                for (var j = 0, k = elements.length; j < k; ++j) {
                    var e = elements[j];
                    if (!e.isDisposed()){
                        refinedElements.push(e);
                    }
                }
                elements = refinedElements;
            }
        },
        childrenChanged: function(e){
            for (var i = 0, l = this._behaviors.length; i < l; ++i){
                if (e.element && e.element.isDisposed()){
                    continue;
                }
                var behavior = this._behaviors[i];
                behavior.childrenChanged(e);
            }
        },
        dispose: function(){
            for (var i = 0, l = this._behaviors.length; i < l; ++i){
                var behavior = this._behaviors[i];
                behavior.dispose();
            }
            delete this._behaviors;
            Behavior.prototype.dispose.apply(this, arguments);
        }
    });
});