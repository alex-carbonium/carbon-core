import Resources from "framework/Resources";
import ObjectCache from "framework/ObjectCache";
import PropertyMetadata from "framework/PropertyMetadata";
import PropertyTypes from "framework/PropertyTypes";
import StrokePosition from "framework/StrokePosition";
import Invalidate from "framework/Invalidate";
var Brush = sketch.framework.Brush = {};

Brush.canApply = function (brushObject) {
    return brushObject && brushObject.type && brushObject.value;
}

Brush.toString = function (brushObject) {
    return brushObject.type + " " + brushObject.value;
}

Brush.doesSupportMode = function (brushObject, mode) {
    return true;//this._type.isValuePossible(mode);
}


Brush.getBrush = function (brushObject, context, l, t, w, h) {
    var type = brushObject.type;
    var value = brushObject.value;
    var canApply = Brush.canApply(brushObject);
    var brush = null;

    if (canApply) {
        switch (type) {
            case "color":
                brush = value;
                break;
            case "gradient":
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
            case "resourceGradient":
            case "resource":
                var r = Resources.getSystemResource(value);
                if (!r) {
                    throw "Resource not found: " + value;
                }
                brush = r.value;
                return Brush.getBrush(r.value, context, l, t, w, h);
            case "empty":
                brush = null;
                break;
            case "customPattern":
            case "resourcePattern":
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
}

Brush.clone = function (brushObject) {
    return Object.assign({}, brushObject);
}

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
            case null:
            case "empty":
                style.backgroundImage = 'url("/target/res/app/transparency1.png")';
                break;
            case "color":
                style.backgroundColor = brush.value;
                break;
            case "resource":
                var r = Resources.getSystemResource(brush.value);
                return Brush.toCss(r.value);
        }
    }
    return style;
};
//doesSupportMode:function (mode) {
//           return this._type.isValuePossible(mode);
//       },

Brush.PossibleValues = {
    "null": "Empty",
    color: "Color",
    gradient: "Custom gradient",
    resource: "Resource",
    resourceGradient: "Resource gradient",
    resourcePattern: "Resource pattern",
    customPattern: "Custom pattern"
};

Brush.hashKey = function (parameters) {
    return parameters.type + "#" + JSON.stringify(parameters);
};


Brush.create = function (type, value) {
    //cache = cache === undefined ? true : cache;
    var param = {};

    param.__type__ = "sketch.framework.Brush";
    param.type = type;
    param.value = value;

    //if (cache){
    //    return ObjectCache.instance.getOrPut(
    //        "sketch.framework.Brush",
    //        Brush.hashKey(param),
    //        function(){
    //            return param;
    //        });
    //}
    return param;
};

Brush.createFromObject = function (parameters) {
    parameters.__type__ = "sketch.framework.Brush";
    return parameters;
};

Brush.createFromColor = function (color, width) {
    var param = {};
    param.__type__ = "sketch.framework.Brush";
    param.type = "color";
    param.value = color;
    param.lineWidth = width || 1;
    param.strokePosition = 1;
    return param;
};

Brush.createFromGradientResource = function (key, width) {
    var param = {};
    param.__type__ = "sketch.framework.Brush";
    param.type = "resourceGradient";
    param.value = key;
    param.lineWidth = width;
    return param;
};

Brush.createEmptyBrush = function () {
    var param = {};
    param.__type__ = "sketch.framework.Brush";
    param.type = null;
    param.value = null;
    param.lineWidth = 0;
    return param;
};

Brush.createFromGradientPoints = function (points, width) {
    var param = {};
    param.__type__ = "sketch.framework.Brush";
    param.type = "gradient";
    param.value = points;
    param.lineWidth = width;

    return param;
};

Brush.createFromResourcePattern = function (url) {
    var param = {};
    param.__type__ = "sketch.framework.Brush";
    param.type = "resourcePattern";
    param.value = url;
    return param;
};

Brush.createFromResource = function (resourceId) {
    var param = {};
    param.__type__ = "sketch.framework.Brush";
    param.type = "resource";
    param.value = resourceId;
    return param;
};

Brush.Black = Object.freeze(Brush.createFromColor('#000'));
Brush.White = Object.freeze(Brush.createFromColor('#fff'));
Brush.Empty = Brush.None = Object.freeze(Brush.createEmptyBrush());

PropertyMetadata.extend({
    "sketch.framework.Brush": {
        type: {
            useInModel: true,
            possibleValues: Brush.PossibleValues
        },
        value: {
            useInModel: true
        },
        lineWidth: {
            useInModel: true,
            defaultValue:1
        },
        strokePosition: {
            useInModel: true,
            defaultValue: StrokePosition.Inside
        }
    }
});

PropertyTypes.fill.defaultValue = Brush.Empty;
PropertyTypes.stroke.defaultValue = Brush.Empty;

export default Brush;
