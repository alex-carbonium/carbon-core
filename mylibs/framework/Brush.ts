import Invalidate from "./Invalidate";
import TypeDefaults from "./TypeDefaults";
import { Types } from "./Defs";
import { BrushType } from "carbon-runtime";

var brushDefault = TypeDefaults[Types.Brush] = function () {
    return new Brush("black");
}

function gradientToCss(gradient) {
    if (!gradient || !gradient.stops) {
        return "transparent";
    }
    var res = 'linear-gradient(to right';
    for (var s of gradient.stops) {
        res += `, ${s[1]} ${s[0] * 100}%`
    }
    return res + ")";
}

export default class Brush {
    public t: string;
    public e: boolean;//enabled
    public o: number;//opacity

    constructor(public value: any, public type: BrushType = BrushType.color) {
        this.t = Types.Brush;
        this.e = true;
        this.o = 1;
    }

    static canApply(brushObject) {
        return brushObject && brushObject.type && brushObject.value && brushObject.e;
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
                case BrushType.lineargradient:
                    let x1 = value.x1;
                    let y1 = value.y1;
                    let x2 = value.x2;
                    let y2 = value.y2;

                    var lingrad = context.createLinearGradient(x1 * w, y1 * h, x2 * w, y2 * h); //down

                    // if (d === "radial") {
                    //     var radius = Math.max(w, h) / 2 + (Math.max(w, h) / 20);
                    //     lingrad = context.createRadialGradient(l + w / 2, t + h / 2, 0, l + w / 2, t + h / 2, radius);
                    // }
                    if (value.stops) {
                        for (var i = 0, length = value.stops.length; i < length; ++i) {
                            var pos = value.stops[i][0];
                            if (pos > 1) {
                                pos = 1;
                            }
                            if (pos < 0) {
                                pos = 0;
                            }
                            lingrad.addColorStop(pos, value.stops[i][1]);
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
                var oldOpacity = context.globalAlpha;
                context.globalAlpha = oldOpacity * brushObject.o;
                context.fill2();
                context.globalAlpha = oldOpacity;
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
                var oldOpacity = context.globalAlpha;
                context.globalAlpha = oldOpacity * brushObject.o;
                context.stroke();
                context.globalAlpha = oldOpacity;
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

    static isValid(brush) {
        if (brush) {
            switch (brush.type) {
                case BrushType.empty:
                    return true;
                case BrushType.color:
                    return brush.value !== undefined;
                case BrushType.lineargradient:
                    return brush.value !== undefined &&
                        brush.value.x1 !== undefined &&
                        brush.value.x2 !== undefined &&
                        brush.value.y1 !== undefined &&
                        brush.value.y2 !== undefined &&
                        brush.value.stops !== undefined;
            }
        }

        return false;
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
                case BrushType.lineargradient:
                    style.background = gradientToCss(brush.value);
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
        return this.createFromObject({ t:type, value });
    }

    static extend(brush, obj) {
        return this.createFromObject(Object.assign({type:brush.type, value:brush.value}, obj));
    }

    static createFromObject(parameters): Brush {
        return Object.freeze(Object.assign(brushDefault(), parameters));
    }

    static createFromCssColor(color): Brush {
        var brush = {/*type = color by default*/ value: color }
        return this.createFromObject(brush);
    }

    static createEmptyBrush(): Brush {
        return this.createFromObject({ type: BrushType.empty });
    }

    static createFromLinearGradientObject(value): Brush {
        return this.createFromObject({ type: BrushType.lineargradient, value: value });
    }

    static createFromResource(resourceId): Brush {
        return this.createFromObject({ type: BrushType.resource, value: resourceId });
    }

    static Black: Brush;
    static White: Brush;
    static Empty: Brush;
    static None: Brush;
}

Brush.Black = Object.freeze(Brush.createFromCssColor('#000'));
Brush.White = Object.freeze(Brush.createFromCssColor('#fff'));
Brush.Empty = Brush.None = Object.freeze(Brush.createEmptyBrush());