

(function(fwk) {
    klass2('sketch.framework.FrameRateCounter', null, {
        _constructor: function(outputSelector){
            this.outputElement = $(outputSelector);
            this.counter = 0;
            this.fps = 0;
        },

        processFrame: function(){
            if (!this.lastTime) {
                this.lastTime = new Date();
            }
            else {
                var now = new Date();
                var diff = Math.ceil((now.getTime() - this.lastTime.getTime()));

                if (diff >= 1000) {
                    this.fps = this.counter;
                    this.counter = 0;
                    this.lastTime = now;
                    this.outputElement.html(this.fps);
                }
            }

            ++this.counter;
        }
    });
})(sketch.framework);