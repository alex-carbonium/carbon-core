import Invalidate from "./Invalidate";
import TypeDefaults from "./TypeDefaults";
import { Types } from "./Defs";
import { BrushType } from "carbon-basics";

var brushDefault = TypeDefaults[Types.Brush] = function () {
    return new Brush("black");
}

export default class Brush {
    public t: string;

    constructor(public value: any, public type:BrushType = BrushType.color){
        this.t = Types.Brush;
    }

    static canApply(brushObject) {
        return brushObject && brushObject.type && brushObject.value;
    }

    static toString(brushObject) {
        return brushObject.type + " " + brushObject.value;
    }

    static getBrush(brushObject, context, l, t, w, h) {
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
                // case BrushType.resource:
                //     var r = Resources.getSystemResource(value);
                //     if (!r) {
                //         throw "Resource not found: " + value;
                //     }
                //     brush = r.value;
                //     return Brush.getBrush(r.value, context, l, t, w, h);
                case BrushType.empty:
                    brush = null;
                    break;
                // case BrushType.pattern:
                //     var image = Resources[value];
                //     if (image) {
                //         brush = context.createPattern(image, "repeat");
                //     }
                //     else {
                //         Resources.addImage(value, value, Invalidate.request);
                //     }
                //     break;
                default:
                    throw "Unknown brush type " + type;
            }
        }

        return brush;
    }

    static clone(brushObject) {
        return Brush.createFromObject(brushObject);
    }

    static toGradient(brushObject) {
        // var sliders = Resources[brushObject.value()] || [];
        // var returnSliders = [];
        // each(sliders, function () {
        //     returnSliders.push([Math.round(brushObject.offset * 1000) / 10, brushObject.color]);
        // });
        // return returnSliders;
    }

    static fill(brushObject, context, l?: number, t?: number, w?: number, h?: number) {
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

    static stroke(brushObject, context, l?: number, t?: number, w?: number, h?: number) {
        if (Brush.canApply(brushObject)) {
            var brush = Brush.getBrush(brushObject, context, l, t, w, h);
            if (brush) {
                context.strokeStyle = brush;
                context.stroke();
            }
            return true;
        }
        return false;
    }

    static setFill(brushObject, context, l, t, w, h) {
        if (Brush.canApply(brushObject)) {
            var brush = Brush.getBrush(brushObject, context, l, t, w, h);
            context.fillStyle = brush;
            return true;
        }
        return false;
    }

    static setStroke(brushObject, context, l, t, w, h) {
        if (Brush.canApply(brushObject)) {
            var brush = Brush.getBrush(brushObject, context, l, t, w, h);
            context.strokeStyle = brush;
            return true;
        }

        return false;
    }

    static equals(brush1, brush2) {
        return brush1.type === brush2.type && brush1.value === brush2.value;
    }

    static toCss(brush) {
        var style: any = {}
        if (brush) {
            switch (brush.type) {
                case BrushType.empty:
                    style.backgroundImage = 'url("/target/res/app/transparency1.png")';
                    break;
                case BrushType.color:
                    style.backgroundColor = brush.value;
                    break;
                // case BrushType.resource:
                //     var r = Resources.getSystemResource(brush.value);
                //     if (!r) {
                //         debugger;
                //     }
                //     return Brush.toCss(r.value);
            }
        }
        return style;
    }

    static create(type, value) {
        return this.createFromObject({ type, value });
    }

    static createFromObject(parameters): Brush {
        return Object.freeze(Object.assign(brushDefault(), parameters));
    }

    static createFromColor(color): Brush {
        var brush = {/*type = color by default*/ value: color }
        return this.createFromObject(brush);
    }

    static createEmptyBrush(): Brush {
        return this.createFromObject({ type: BrushType.empty });
    }

    static createFromGradientPoints(points): Brush {
        return this.createFromObject({ type: BrushType.gradient, value: points });
    }

    static createFromResource(resourceId): Brush {
        return this.createFromObject({ type: BrushType.resource, value: resourceId });
    }

    static Black: Brush;
    static White: Brush;
    static Empty: Brush;
    static None: Brush;
}

Brush.Black = Object.freeze(Brush.createFromColor('#000'));
Brush.White = Object.freeze(Brush.createFromColor('#fff'));
Brush.Empty = Brush.None = Object.freeze(Brush.createEmptyBrush());