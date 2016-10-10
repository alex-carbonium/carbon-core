import Environment from "environment";

define(["decorators/ActiveFrame"], function(ActiveFrame){
    return klass2('sketch.decorators.ResizeFrame', ActiveFrame, (function(){
        return {
            _constructor: function(){

            },
            attach: function(element){
                //to support unit testing without a view
                if (Environment.view){
                    ActiveFrame.prototype.attach.apply(this, arguments);
                }
            },
            detach: function(){
                //to support unit testing without a view
                if (Environment.view){
                    ActiveFrame.prototype.detach.apply(this, arguments);
                }
            }
        }
    }()));
});
