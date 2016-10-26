define(function(){
    return klass({
        _constructor: function(){
        },
        setParent: function(parentBehavior){
            this._parentBehavior = parentBehavior;
        },
        childrenChanged: function(e){
        },
        assignContainer: function(container) {
            this._container = container;
        },
        attach: function(container) {
            this.assignContainer(container);
            this.bindChildrenChanged();
            this.apply(container.getChildren());
        },
        detach: function(){
            this.unbindChildrenChanged();
        },
        bindChildrenChanged: function(){
            if (this._parentBehavior){
                this._parentBehavior.bindChildrenChanged();
            }
            else {
                this._childrenChangedSubscription = this._container.getChildren().changed.bind(this, this.childrenChanged);
            }
        },
        unbindChildrenChanged: function(){
            if (this._parentBehavior){
                this._parentBehavior.unbindChildrenChanged();
            }
            else if (this._childrenChangedSubscription){
                this._childrenChangedSubscription.dispose();
                delete this._childrenChangedSubscription;
            }
        },
        apply: function(elements){
        },
        isBound: function(){
            if (this._parentBehavior){
                return this._parentBehavior.isBound();
            }
            return this._childrenChangedSubscription;
        },
        dispose: function(){
            this.detach();
            if (this._childrenChangedSubscription){
                this._childrenChangedSubscription.dispose();
                delete this._childrenChangedSubscription;
            }
        },
        displayName: function() {
            return "Undefined";
        },
        editDialog: function(){
        },
        toJSON: function(){
            var json = {};
            json.t = this.t;
            json.properties = {};
            return json;
        },
        fromJSON: function(data){
        }
    });
});