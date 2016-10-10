import Invalidate from "framework/Invalidate";

define(["./All"], function(All){
    return klass(All, {
        richUI: function(){
            return false;
        },
        platformSpecificRunCode: function(){
        },
        createCanvas: function(){
            All.prototype.createCanvas.apply(this, arguments);
            this.canvas.style.position = "static";
        },
        ensureCanvasSize: function(){
            var view = this.view;
            var viewWidth = view.width();
            var viewHeight = view.height();

            if (this.canvas.width !== viewWidth || this.canvas.height !== viewHeight) {
                var oldSize = {width:this.canvas.width, height:this.canvas.height};

                this.canvas.width = viewWidth;
                this.canvas.style.width = viewWidth + "px";

                this.canvas.height = viewHeight;
                this.canvas.style.height = viewHeight + "px";

                Invalidate.request();
            }

        }
    });
});
