import Resources from "./Resources";
import Invalidate from "./Invalidate";
import TypeDefaults from "./TypeDefaults";
import {Types, StrokePosition} from "./Defs";

var Brush = sketch.framework.Brush = {};

var BrushType = {
    empty: 0,
    color: 1,
    gradient: 2,
    resource: 3,
    pattern: 4
};

var defaults = {
    type: BrushType.color,
    position: StrokePosition.Inside,
    lineWidth: 1
};
function BrushConstructor(){
    this.t = Types.Brush;
}
BrushConstructor.prototype = defaults;
var brushDefault = TypeDefaults[Types.Brush] = function(){
    return new BrushConstructor();
};

Brush.canApply = function (brushObject) {
    return brushObject && brushObject.type && brushObject.value;
};

Brush.toString = function (brushObject) {
    return brushObject.type + " " + brushObject.value;
};

Brush.getBrush = function (brushObject, context, l, t, w, h) {
    var type = brushObject.type;
    var value = brushObject.value;
    var canApply = Brush.canApply(brushObject);
    var brush = null;

    if (canApply) {
        switch (type) {
            case BrushType.color:
                brush = value;
                break;
            case BrushType.gradient:
                var d = value.direction || "down";
                var lingrad = context.createLinearGradient(l, t, l, t + h); //down
                if (d == "up") {
                    lingrad = context.createLinearGradient(l, t + h, l, t);
                }
                if (d == "left") {
                    lingrad = context.createLinearGradient(l, t, l + w, t);
                }
                if (d == "right") {
                    lingrad = context.createLinearGradient(l + w, t, l, t);
                }
                if (d == "radial") {
                    var radius = Math.max(w, h) / 2 + (Math.max(w, h) / 20);
                    lingrad = context.createRadialGradient(l + w / 2, t + h / 2, 0, l + w / 2, t + h / 2, radius);
                }
                if (value.sliders) {
                    for (var i = 0, length = value.sliders.length; i < length; ++i) {
                        var pos = value.sliders[i][0] / 100;
                        if (pos > 1) {
                            pos = 1;
                        }
                        if (pos < 0) {
                            pos = 0;
                        }
                        lingrad.addColorStop(pos, value.sliders[i][1]);
                    }
                }
                brush = lingrad;
                break;
            case BrushType.resource:
                var r = Resources.getSystemResource(value);
                if (!r) {
                    throw "Resource not found: " + value;
                }
                brush = r.value;
                return Brush.getBrush(r.value, context, l, t, w, h);
            case BrushType.empty:
                brush = null;
                break;
            case BrushType.pattern:
                var image = Resources[value];
                if (image) {
                    brush = context.createPattern(image, "repeat");
                }
                else {
                    Resources.addImage(value, value, Invalidate.request);
                }
                break;
            default:
                throw "Unknown brush type " + type;
        }
    }

    return brush;
};

Brush.clone = function (brushObject) {
    return Brush.createFromObject(brushObject);
};

Brush.toGradient = function (brushObject) {
    var sliders = Resources[brushObject.value()] || [];
    var returnSliders = [];
    $.each(sliders, function () {
        returnSliders.push([Math.round(brushObject.offset * 1000) / 10, brushObject.color]);
    });
    return returnSliders;
}

Brush.fill = function (brushObject, context, l, t, w, h) {
    if (Brush.canApply(brushObject)) {
        var brush = Brush.getBrush(brushObject, context, l, t, w, h);
        if (brush) {
            context.fillStyle = brush;
            context.fill2();
        }
        return true;
    }
    return false;
}

Brush.stroke = function (brushObject, context, l, t, w, h, lineMultiplier) {
    if (Brush.canApply(brushObject)) {
        var brush = Brush.getBrush(brushObject, context, l, t, w, h);
        if (brush) {
            context.strokeStyle = brush;
            if (brushObject.lineWidth) {
                lineMultiplier = lineMultiplier || 1;
                context.lineWidth = brushObject.lineWidth * lineMultiplier;
            }

            context.stroke();
        }
        return true;
    }
    return false;
}

Brush.setFill = function (brushObject, context, l, t, w, h) {
    if (Brush.canApply(brushObject)) {
        var brush = Brush.getBrush(brushObject, context, l, t, w, h);
        context.fillStyle = brush;
        return true;
    }
    return false;
}

Brush.setStroke = function (brushObject, context, l, t, w, h) {
    if (Brush.canApply(brushObject)) {
        var brush = Brush.getBrush(brushObject, context, l, t, w, h);
        context.strokeStyle = brush;
        return true;
    }

    return false;
}

Brush.equals = function (brush1, brush2) {
    return brush1.type === brush2.type && brush1.value === brush2.value;
}

Brush.toCss = function (brush) {
    var style = {};
    if (brush) {
        switch (brush.type) {
            case BrushType.empty:
                style.backgroundImage = 'url("/target/res/app/transparency1.png")';
                break;
            case BrushType.color:
                style.backgroundColor = brush.value;
                break;
            case BrushType.resource:
                var r = Resources.getSystemResource(brush.value);
                return Brush.toCss(r.value);
        }
    }
    return style;
};

Brush.create = function (type, value) {
    return this.createFromObject({type, value});
};

Brush.createFromObject = function (parameters) {
    return Object.assign(brushDefault(), parameters);
};

Brush.extend = function(...brushes){
    return this.createFromObject(Object.assign({}, ...brushes));
};

Brush.createFromColor = function (color) {
    return this.createFromObject({/*type = color by default*/ value: color});
};

Brush.createEmptyBrush = function () {
    return this.createFromObject({type: BrushType.empty});
};

Brush.createFromGradientPoints = function (points) {
    return this.createFromObject({type: BrushType.gradient, value: points});
};

Brush.createFromResource = function (resourceId) {
    return this.createFromObject({type: BrushType.resource, value: resourceId});
};

Brush.Black = Object.freeze(Brush.createFromColor('#000'));
Brush.White = Object.freeze(Brush.createFromColor('#fff'));
Brush.Empty = Brush.None = Object.freeze(Brush.createEmptyBrush());

export default Brush;
