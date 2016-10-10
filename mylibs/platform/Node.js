import {isBrowser} from "../util";

define(["./All", "framework/render/Context"], function (All, Context){
    if (isBrowser){
        return null;
    }

    //var Canvas = require('canvas');
    var Canvas = null;

    function createContext(canvas){
        var context = new Context(canvas);;
        if (Canvas.Font){
            addFont(context, 'TomsHandwritten', '/img/fonts/toms/280747_0_0.ttf', ['bold', 'italic']);
            addFont(context, 'NinjamockBasic2', '/img/fonts/Basic2/Basic2.ttf');
        }
        else{
            console.log('Custom fonts not supported, build node-canvas with font support');
        }

        //context.patternQuality = "best";
        //context.textDrawingMode = "path";
        //context.filter = "nearest";
        //context.imageSmoothingEnabled = false;
        //context.antialias = 'subpixel';

        return context;
    }

    function addFont(context, name, file, faces){
        var fullFile = ".." + file; //relative to build dir
        var font = new Canvas.Font(name, fullFile);
        if (faces){
            var args = [fullFile].concat(faces);
            font.addFace.apply(font, args);
        }
        context.addFont(font);
    }

    function dummy(){
    }

    return klass(All, {
        //this method is no longer called from the app
        createView: function(){
            this.view = view;
            this.view.attachToDOM(this.context, this.upperContext, null, null, dummy, dummy);
            this.view.resize({x:0, y:0, width:1024, height:768});
            return this.view;
        },
        createImage: function(){
            return new Canvas.Image();
        },
        viewportSize: function(){
            return {width:1024, height:768};
        },
        createCanvas: function(w, h){
            var canvas1 = new Canvas(w, h);
            var canvas2 = new Canvas(w, h);

            this.context = createContext(canvas1);
            this.upperContext = createContext(canvas2);

        }
    });
});
