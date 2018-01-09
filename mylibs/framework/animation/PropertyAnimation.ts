import { IUIElement, AnimationProps, IAnimationOptions, ChangeMode } from "carbon-core";
import AnimationGroup from "./AnimationGroup";
import Environment from "environment";
import { RuntimeProxy } from "../../code/runtime/RuntimeProxy";
import Brush from "../Brush";
import { Color } from "../Color";
import Matrix from "math/matrix";
import Rect from "math/rect";
import Point from "../../math/point";

let hsluvConvertor = {
    from: function (values: number[]) {
        return Brush.createFromCssColor(
            Color.fromHSLuvA(values[0], values[1], values[2], values[3]).toCssString()
        );
    },

    to: function (value: Brush, element:IUIElement): number[] {
        let hsl = Color.fromBrush(value).toHSLuvA();
        return [hsl.h, hsl.s, hsl.l, hsl.a];
    }
}

let hslConvertor = {
    from: function (values: number[]) {
        return Brush.createFromCssColor(
            Color.fromHSLA(values[0], values[1], values[2], values[3]).toCssString()
        );
    },

    to: function (value: Brush, element:IUIElement): number[] {
        let hsl = Color.fromBrush(value).toHSLA();
        return [hsl.h, hsl.s, hsl.l, hsl.a];
    }
}

let hsvConvertor = {
    from: function (values: number[]) {
        return Brush.createFromCssColor(
            Color.fromHSVA(values[0], values[1], values[2], values[3]).toCssString()
        );
    },

    to: function (value: Brush, element:IUIElement): number[] {
        let hsl = Color.fromBrush(value).toHSVA();
        return [hsl.h, hsl.s, hsl.v, hsl.a];
    }
}

let rgbConvertor = {
    from: function (values: number[]) {
        return Brush.createFromCssColor(
            Color.fromRGBA(values[0], values[1], values[2], values[3]).toCssString()
        );
    },

    to: function (value: Brush, element:IUIElement): number[] {
        let hsl = Color.fromBrush(value).toRGBA();
        return [hsl.r, hsl.g, hsl.b, hsl.a];
    }
}

let matrixConvertor = {
    from: function (v: number[]) {
        //return new Matrix(values[0], values[1], values[2], values[3], values[4], values[5]);

        var rotate = Matrix.Identity.clone().rotate(v[2], v[0], v[1]);
        var scale = Matrix.Identity.clone().scale(v[3], v[4], v[0], v[1]);
        var scew = Matrix.Identity.clone().skew(new Point(v[7], v[8]), new Point(v[0], v[1]));
        let m = rotate.append(scale).append(scew);
        m.tx = v[5];
        m.ty = v[6];
        return m;
    },

    to: function (v: Matrix, element:any): number[] {
        let origin = element.rotationOrigin();
        let d = v.decompose();
        return [origin.x, origin.y, d.rotation, d.scaling.x, d.scaling.y, d.translation.x, d.translation.y, d.skewing.x, d.skewing.y];
    }
}

let pointConvertor = {
    from: function (values: number[]) {
        return new Point(values[0], values[1]);
    },

    to: function (v: Point): number[] {
        return [v.x, v.y];
    }
}

let rectConvertor = {
    from: function (values: number[]) {
        return new Rect(values[0], values[1], values[2], values[3]);
    },

    to: function (v: Rect): number[] {
        return [v.x, v.y, v.width, v.height];
    }
}

function getValueConvertor(value, options) {
    if (value instanceof Brush) {
        if (options.colorModel === "hsl") {
            return hsluvConvertor;
        } else if (options.colorModel === "hsv") {
            return hsvConvertor;
        } else if (options.colorModel === "rgb") {
            return rgbConvertor;
        } else {
            return hsluvConvertor;
        }
    }

    if (value instanceof Matrix) {
        return matrixConvertor;
    }

    if (value instanceof Rect) {
        return rectConvertor;
    }

    return null;
}


export class PropertyAnimation {
    private animationValues: any[];
    private group: AnimationGroup;

    constructor(element: IUIElement, private properties: AnimationProps, private options: IAnimationOptions, progressCallback: () => void = null) {
        let animationValues = this.animationValues = [];
        options = extend({}, options);
        element = RuntimeProxy.unwrap(element);
        options.duration = Math.max(options.duration || 0, 1);
        this.properties = properties = clone(properties);
        element.prepareProps(properties, ChangeMode.Self);
        // if (properties.m) {
        //     var d = (properties.m as any).decompose();
        //     if (d) {
        //         //properties.angle = -d.rotation;
        //         //properties.m = Matrix.createTranslationMatrix(d.translation.x, d.translation.y);
        //         let origin = (element as any).rotationOrigin();
        //         var rotate = Matrix.Identity.clone().rotate(d.rotation, origin.x, origin.y);
        //         var scale = Matrix.Identity.clone().scale(d.scaling.x, d.scaling.y, origin.x, origin.y);
        //         var translate = Matrix.Identity.clone().translate(d.translation.x, d.translation.y);
        //         var scew = Matrix.Identity.clone().skew(d.skewing, origin);

        //         let m = rotate.append(scale).append(scew);
        //         m.tx = translate.tx;
        //         m.ty = translate.ty;
        //     }
        // }

        for (let propName in properties) {
            let newValue = properties[propName];
            let convertor: any = getValueConvertor(newValue, options);

            let accessor = (function (name) {
                if (element[name] !== undefined) {
                    return function prop_accessor(value?: any) {
                        if (arguments.length > 0) {
                            if (convertor) {
                                element[name] = convertor.from(value);
                            } else {
                                element[name] = value;
                            }
                        }
                        if (convertor) {
                            return convertor.to(element[name] as any, element);
                        }
                        return element[name];
                    }
                }
                return function prop_accessor(value?: any) {
                    if (arguments.length > 0) {
                        if (convertor) {
                            element.setProps({ [name]: convertor.from(value) });
                        } else {
                            element.setProps({ [name]: value });
                        }
                    }
                    if (convertor) {
                        return convertor.to(element.props[name], element);
                    }
                    return element.props[name];
                }
            })(propName);

            let currentValue = accessor();

            if (convertor) {
                newValue = (convertor as any).to(newValue as any, element);
            }

            animationValues.push({ from: currentValue, to: newValue, accessor: accessor });
        }

        this.group = new AnimationGroup(this.animationValues, this.options, progressCallback);
    }

    set onAnimationEnd(value) {
        if (this.group) {
            this.group.onAnimationEnd = value;
        }
    }

    start(): Promise<void> {
        if (this.group) {
            Environment.view.animationController.registerAnimationGroup(this.group);
        }

        return this.group.promise();
    }

    stop() {
        if (this.group) {
            this.group.stop();
            this.group = null;
        }
    }

    restart() {
        if (this.group) {
            this.group.restart();
        }

        return this.group.promise();
    }

    reset() {
        if (this.group) {
            this.group.reset();
        }
    }

    finish() {
        if (this.group) {
            this.group.finish();
        }
    }
}