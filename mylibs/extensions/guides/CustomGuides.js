import PropertyMetadata from "framework/PropertyMetadata";
import Brush from "framework/Brush";
import tinycolor from "tinycolor2/tinycolor";
import Guide from "./Guide";
import {Types} from "../../framework/Defs";

class CustomGuides extends Guide{
    constructor(view){
        super();
        this._view = view;
        this.capturedIndexX = -1;
        this.capturedIndexY = -1;
    }

    drawX(context, minx, height){
        context.save();

        var scale = this._view.scale();
        context.globalAlpha *= this.opacity();
        context.beginPath();

        for (let i = 0; i < this.props.xs.length; ++i){
            let x = this.props.xs[i] * scale - minx + .5|0;
            if (i !== this.capturedIndexX){
                context.moveTo(x + .5, 0);
                context.lineTo(x + .5, height);
            }
        }

        Brush.stroke(this.stroke(), context);

        context.restore();
    }

    drawY(context, miny, width){
        context.save();

        var scale = this._view.scale();
        context.globalAlpha *= this.opacity();
        context.beginPath();

        for (let i = 0; i < this.props.ys.length; ++i){
            let y = this.props.ys[i] * scale - miny + .5|0;
            if (i !== this.capturedIndexY){
                context.moveTo(0, y + .5);
                context.lineTo(width, y + .5);
            }
        }

        Brush.stroke(this.stroke(), context);

        context.restore();
    }

    prepareProps(props){
        if (props.guides){
            var xs = [];
            var ys = [];
            var snapPoints = {xs: [], ys: [], noLine: true};
            for (let i = 0, l = props.guides.x.length; i < l; i++){
                var x = props.guides.x[i];
                xs.push(x);

                snapPoints.xs.push(props.origin.x + x, props.origin.x + x + 1);
            }
            for (let i = 0, l = props.guides.y.length; i < l; i++){
                var y = props.guides.y[i];
                ys.push(y);

                snapPoints.ys.push(props.origin.y + y, props.origin.y + y + 1);
            }
            props.xs = xs;
            props.ys = ys;
            props.snapPoints = snapPoints;
        }
        else{
            props.xs = [];
            props.ys = [];
            props.snapPoints = {xs: [], ys: []};
        }
    }

    tryCaptureX(x){
        this.capturedIndexX = this.findClosest(this.props.xs, x);
        return this.capturedIndexX !== -1;
    }
    tryCaptureY(y){
        this.capturedIndexY = this.findClosest(this.props.ys, y);
        return this.capturedIndexY !== -1;
    }
    releaseCaptured(){
        this.capturedIndexX = -1;
        this.capturedIndexY = -1;
    }
    findClosest(values, x){
        var scale = this._view.scale();
        var minDiff = Number.POSITIVE_INFINITY;
        var minIndex = -1;
        for (let i = 0, l = values.length; i < l; ++i) {
            let value = values[i];
            let diff = Math.abs(value - x) * scale;
            if (diff < minDiff){
                minDiff = diff;
                minIndex = i;
            }
        }
        if (minDiff < 4){
            return minIndex;
        }
        return -1;
    }
}
CustomGuides.prototype.t = Types.CustomGuide;

CustomGuides.setDefaultStrokeHsl = function(hsl){
    var strokeRgb = tinycolor(hsl).toRgbString();
    var strokeBrush = Brush.createFromColor(strokeRgb);
    var prototype = PropertyMetadata.getPropsPrototype(CustomGuides.prototype.t);
    prototype.stroke = strokeBrush;
};

CustomGuides.setDefaultOpacity = function(opacity){
    var prototype = PropertyMetadata.getPropsPrototype(CustomGuides.prototype.t);
    prototype.opacity = opacity;
};

PropertyMetadata.registerForType(CustomGuides, {
    stroke: {
        defaultValue: Brush.createFromColor("red")
    },
    opacity: {
        defaultValue: 1
    },
    xs: {
        defaultValue: []
    },
    ys: {
        defaultValue: []
    },
    snapPoints: {
        defaultValue: {xs: [], ys: []}
    }
});

export default CustomGuides;