define(function() {
    return klass({
        _constructor: function(context) {
            this.context = context;
        },
        measureText: function(text, fontStyle) {
            this.context.save();
            this.context.font = fontStyle;
            var measure = this.context.measureText(text);
            this.context.restore();
            return measure;
        }
    });
});