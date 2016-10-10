define(["framework/validation/Validator"], function(Validator){
    return klass(Validator, {
        _constructor: function() {
        },
        validate: function(event){
            var v = parseInt(event.newValue);

            if (isNaN(v)) {
                this.addError("value", "The value must be an integer number");
                event.ok = false;
                event.changedValue = event.oldValue;
            }
        }
    });
});