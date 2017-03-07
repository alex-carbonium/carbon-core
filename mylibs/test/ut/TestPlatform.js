define(["platform/All"], function(All){
    var fwk = sketch.framework;

    return klass2("sketch.test.TestPlatform", All, (function(){
        return {
            viewportSize:function(){
                return {width:3000, height:2000, x:0, y:0};
            },
            createCanvas: function(){
                this.canvas = document.createElement("canvas");
                this.context = this.canvas.getContext("2d");
            },
            platformSpecificRunCode: function(){
            },
            ensureCanvasSize: function(){
            },
            toggleVisualElements: function(){
            }
        };
    })());
});