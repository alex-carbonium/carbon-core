define(function() {
    return klass({
        _constructor: function(){
            this.clear();
        },
        init: function(){
        },
        clear: function(){
            this._errors = {};
        },
        addError: function(id, message){
            this._errors[id] = message;
        },
        getErrors: function(){
            return this._errors;
        },
        validate: function(event){
        }
    });
});