import { Types } from "./Defs";
import TypeDefaults from "./TypeDefaults";

var boxDefault = TypeDefaults[Types.Box] = function () { return new Box(); };

var defaults = {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0
};

export default class Box {
    t: string;

    constructor(){
        this.t = Types.Box;
    }

    static createFromObject(obj) {
        return Object.assign(boxDefault(), obj);
    }

    static create(left, top, right, bottom) {
        return Box.createFromObject({ left: left, top: top, right: right, bottom: bottom });
    }

    static Default: Box;
}

Object.assign(Box.prototype, defaults);

Box.Default = Box.createFromObject({});