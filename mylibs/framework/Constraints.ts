import { Types, HorizontalConstraint, VerticalConstraint } from "./Defs";
import TypeDefaults from "./TypeDefaults";

var defaults = {
    v: VerticalConstraint.Top,
    h: HorizontalConstraint.Left
};

var constraintsDefault = TypeDefaults[Types.Constraints] = function () { return new Constraints() };

export default class Constraints {
    t: string;

    constructor(){
        this.t = Types.Constraints;
    }

    static createFromObject(obj) {
        return Object.assign(constraintsDefault(), obj);
    }

    static toArray(constraints) {
        return [constraints.v, constraints.h];
    }

    static create(h, v) {
        return Object.assign(constraintsDefault(), { v: v, h: h });
    };

    static Default: Constraints;
    static All: Constraints;
    static StretchAll: Constraints;
}
Object.assign(Constraints.prototype, defaults);

Constraints.Default = Constraints.createFromObject({});

Constraints.All = Constraints.create(HorizontalConstraint.LeftRight, VerticalConstraint.TopBottom);

Constraints.StretchAll = Constraints.create(HorizontalConstraint.Stretch, VerticalConstraint.Stretch);