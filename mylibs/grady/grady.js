define(["./color", "./gradient"], function (Color, Gradient) {
    var fwk = sketch.framework;
    return klass((function () {
        var defaults;

        var renderColor = function(){
            this._mode = new Color();
        };

        var renderGradient = function(){
            this._mode = new Gradient();
        };

        return {
            _mode: null,
            _constructor: function(){
                defaults = {
                    show: { event: "click", solo: true },
                    hide: { event: "unfocus" },
                    position: {
                        viewport: $(window),
                        adjust: { method: "shift" }
                    },
                    style: {
                        tip: {
                            height: 16,
                            width: 16
                        },
                        width: "450px"
                    }
                };
            },
            setup: function(mode){
                //TODO: refactor
                if(mode == "color") {
                    renderColor.call(this);
                }

                if(mode == "gradient") {
                    renderGradient.call(this);
                }
            },
            mode: function(){
                return this._mode;
            },
            dispose: function(){
                this._mode.dispose();
            }
        }
    })());
});