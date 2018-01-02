import { IUIElement, AnimationProps, IAnimationOptions, ChangeMode } from "carbon-core";
import AnimationGroup from "./AnimationGroup";
import Environment from "environment";
import { RuntimeProxy } from "../../code/runtime/RuntimeProxy";
import Brush from "../Brush";
import { Color } from "../Color";

let hsluvConvertor = {
    from: function (values: number[]) {
        return Brush.createFromCssColor(
            Color.fromHSLuvA(values[0], values[1], values[2], values[3]).toCssString()
        );
    },

    to: function (value: Brush): number[] {
        let hsl = Color.fromBrush(value).toHSLuvA();
        return [hsl.h, hsl.s, hsl.l, hsl.a];
    }
}

export class PropertyAnimation {
    private animationValues: any[];
    private group: AnimationGroup;

    constructor(element: IUIElement, private properties: AnimationProps, private options: IAnimationOptions, progressCallback:()=>void = null) {
        let animationValues = this.animationValues = [];
        options = extend({}, options);
        element = RuntimeProxy.unwrap(element);
        options.duration = Math.max(options.duration || 0, 1);
        this.properties = properties = clone(properties);
        element.prepareProps(properties, ChangeMode.Self);

        for (let propName in properties) {
            let newValue = properties[propName];
            let convertor = null;
            if (newValue instanceof Brush) {
                convertor = hsluvConvertor;
            }

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
                            return convertor.to(element[name]);
                        }
                        return element[name];
                    }
                }
                return function prop_accessor(value?: any) {
                    if (arguments.length > 0) {
                        element.setProps({ [name]: value });
                    }
                    return element.props[name];
                }
            })(propName);

            let currentValue = accessor();

            if(convertor) {
                newValue = convertor.to(newValue);
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