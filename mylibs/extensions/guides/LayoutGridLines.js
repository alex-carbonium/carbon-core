import PropertyMetadata from "framework/PropertyMetadata";
import Brush from "framework/Brush";
import tinycolor from "tinycolor2/tinycolor";
import Guide from "./Guide";

class LayoutGridLines extends Guide{
    constructor(view){
        super();
        this._view = view;
    }

    draw(context){
        context.save();

        var scale = this._view.scale();
        context.scale(1/scale, 1/scale);

        context.globalAlpha *= this.opacity();
        context.beginPath();
        for (let i = 0; i < this.props.xs.length; ++i){
            var x = this.props.xs[i];
            var x1 = (x * scale + .5) | 0;
            var y1 = 0;
            var x2 = x1;
            var y2 = (this.props.rect.height * scale + .5) | 0;
            context.moveTo(x1, y1);
            context.lineTo(x2, y2);
        }

        Brush.stroke(this.borderBrush(), context);

        context.restore();
    }

    prepareProps(props){
        if (props.settings){
            var xs = [];
            var snapPoints = {xs: [], ys: [], noLine: true};
            var isColumn = false;
            var x = props.actualColumnWidth;
            for (let i = 1, l = props.settings.columnsCount * 2 - 1; i < l; i++){
                xs.push(x);

                snapPoints.xs.push(props.rect.x + x, props.rect.x + x + 1);
                snapPoints.ys.push(props.rect.y, props.rect.y + props.rect.height);

                x += isColumn ? props.actualColumnWidth : props.settings.gutterWidth;
                isColumn = !isColumn;

                if (x > props.rect.width){
                    break;
                }
            }
            props.xs = xs;
            props.snapPoints = snapPoints;
        }
    }
}

LayoutGridLines.prototype.__type__ = "LayoutGridLines";

LayoutGridLines.setDefaultStrokeHsl = function(hsl){
    var strokeRgb = tinycolor(hsl).toRgbString();
    var strokeBrush = Brush.createFromColor(strokeRgb);
    var prototype = PropertyMetadata.getPropsPrototype(LayoutGridLines.prototype.__type__);
    prototype.borderBrush = strokeBrush;
};

LayoutGridLines.setDefaultOpacity = function(opacity){
    var prototype = PropertyMetadata.getPropsPrototype(LayoutGridLines.prototype.__type__);
    prototype.opacity = opacity;
};

PropertyMetadata.registerForType(LayoutGridLines, {
    borderBrush: {
        defaultValue: Brush.Black
    },
    opacity: {
        defaultValue: .25
    }
});

export default LayoutGridLines;