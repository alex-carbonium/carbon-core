define(function(){
    var Cache = klass({
        _constructor: function(){
            this._store = {};
        },
        addSupportedType: function(type) {
            this._store[type] = {};
        },
        supportsType: function(type){
            return this._store.hasOwnProperty(type);
        },
        get:function(type, key){
            return this._store[type][key];
        },
        put: function(type, key, value) {
            this._store[type][key] = value;
        },
        getOrPut: function(type, key, constructor){
            var value = this.get(type, key);
            if (!value){
                value = constructor();
            }
            this.put(type, key, value);
            return value;
        }
    });

    Cache.instance = new Cache();
    //Cache.instance.addSupportedType("sketch.framework.Brush");
    //Cache.instance.addSupportedType("sketch.framework.Stroke");
    // Cache.instance.addSupportedType("sketch.framework.Font");
    //Cache.instance.addSupportedType("sketch.framework.QuadAndLock");
    //Cache.instance.addSupportedType("Box");
    //Cache.instance.addSupportedType("sketch.framework.Anchor");
    //Cache.instance.addSupportedType("sketch.framework.Shadow");
    
    return Cache;
});