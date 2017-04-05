import { Types } from "./Defs";
import { IConstraints, HorizontalConstraint, VerticalConstraint } from "carbon-basics";

var defaults: IConstraints = {
    h: HorizontalConstraint.Left,
    v: VerticalConstraint.Top
}

export default class Constraints {
    static createFromObject(obj) {
        return Object.assign({}, defaults, obj);
    }

    static toArray(constraints) {
        return [constraints.v, constraints.h];
    }

    static create(h, v) {
        return Object.assign({}, { v: v, h: h });
    };

    static Default: IConstraints;
    static All: IConstraints;
    static StretchAll: IConstraints;
}

Constraints.Default = defaults;
Constraints.All = Constraints.create(HorizontalConstraint.LeftRight, VerticalConstraint.TopBottom);
Constraints.StretchAll = Constraints.create(HorizontalConstraint.Scale, VerticalConstraint.Scale);