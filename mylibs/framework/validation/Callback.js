define(["framework/validation/Validator"], function(Validator){
    var fwk = sketch.framework;
    return klass(Validator, {
        _constructor: function(callback){
            this._callback = callback;
        },
        validate: function(event){
            if (this._callback instanceof fwk.EventHandler){
                this._callback.raise(event);
            }
            else {
                this._callback(event);
            }
        }
    });
});