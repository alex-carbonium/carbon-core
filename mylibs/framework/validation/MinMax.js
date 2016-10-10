define(["framework/validation/Validator"], function(Validator) {
    return klass(Validator, {
        _constructor: function(min, max) {
            this.init(min, max);
        },
        init: function(min, max){
            this._min = min;
            this._max = max;
        },
        validate: function(event){
            if (this._max !== undefined && event.newValue > this._max) {
                this.addError("max", "The value cannot exceed the maximum value of " + this._max);
                event.changedValue = this._max;
                event.ok = false;
            }

            if (this._min !== undefined && event.newValue < this._min) {
                this.addError("min", "The value cannot be below the minimum value of " + this._min);
                event.changedValue = this._min;
                event.ok = false;
            }
        },
        min: function(){
            return this._min;
        },
        max: function() {
            return this._max;
        }
    });
});