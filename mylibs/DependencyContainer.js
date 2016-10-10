define(function(){
    var Mode = {
        singleton: 1
    };
    return klass({
        _constructor: function(){
            this._store = {};
        },

        resolve: function(type){
            var key = type.prototype.__type__;
            var entry = this._store[key];
            if (entry){
                if (entry.mode === Mode.singleton){
                    return entry.instance;
                }
            }
            return new type();
        },
        registerInstance: function(type, instance){
            var key = type.prototype.__type__;
            this._store[key] = {
                mode: Mode.singleton,
                instance: instance
            };
        }
    });
});
