import PropertyMetadata from "framework/PropertyMetadata";
import Brush from "framework/Brush";
import tinycolor from "tinycolor2/tinycolor";
import Guide from "./Guide";

class LayoutGridColumns extends Guide {
    draw(context){
        context.save();

        context.globalAlpha *= this.opacity();
        context.beginPath();
        for (let i = 0, l = this.props.xs.length; i < l; ++i){
            var x = this.props.xs[i];
            var w = i === l - 1 ? this.props.lastColumnWidth : this.props.actualColumnWidth;
            context.rect(x, 0, w, this.props.rect.height);
        }

        Brush.fill(this.backgroundBrush(), context);

        context.restore();
    }
    prepareProps(props){
        if (props.settings){
            props.lastColumnWidth = props.actualColumnWidth;

            var xs = [];
            var snapPoints = {xs: [], ys: [], noLine: true};
            for (let i = 0; i < props.settings.columnsCount; ++i){
                var x = (i * props.actualColumnWidth) + (i > 0 ? i * props.settings.gutterWidth : 0);
                if (x >= props.rect.width){
                    var diff = x - props.settings.gutterWidth - props.rect.width;
                    props.lastColumnWidth = (props.actualColumnWidth - diff) || props.actualColumnWidth;
                    break;
                }

                xs.push(x);

                snapPoints.xs.push(props.rect.x + x, props.rect.x + x + props.actualColumnWidth);
                snapPoints.ys.push(props.rect.y, props.rect.y + props.rect.height);
            }
            props.xs = xs;
            props.snapPoints = snapPoints;
        }
    }
}

LayoutGridColumns.prototype.__type__ = "LayoutGridColumns";

LayoutGridColumns.setDefaultFillHsl = function(hsl){
    var rgb = tinycolor(hsl).toRgbString();
    var brush = Brush.createFromColor(rgb);
    var prototype = PropertyMetadata.getPropsPrototype(LayoutGridColumns.prototype.__type__);
    prototype.backgroundBrush = brush;
};

LayoutGridColumns.setDefaultOpacity = function(opacity){
    var prototype = PropertyMetadata.getPropsPrototype(LayoutGridColumns.prototype.__type__);
    prototype.opacity = opacity;
};

PropertyMetadata.registerForType(LayoutGridColumns, {
    opacity: {
        defaultValue: .25
    },
    borderBrush: {
        defaultValue: Brush.None
    },
    backgroundBrush: {
        defaultValue: Brush.createFromColor("cyan")
    }
});

export default LayoutGridColumns;