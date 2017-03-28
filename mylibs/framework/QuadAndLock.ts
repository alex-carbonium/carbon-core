import { Types } from "./Defs";
import TypeDefaults from "./TypeDefaults";

var defaults = {
    bottomLeft: 0,
    bottomRight: 0,
    upperLeft: 0,
    upperRight: 0,
    locked: true
};

var quadAndLockTypeDefault = TypeDefaults[Types.QuadAndLock] = function () {
    return new Quad();
}

export default class Quad {
    t: string;

    constructor(){
        this.t = Types.QuadAndLock;
    }

    static createFromObject(obj) {
        return Object.assign(quadAndLockTypeDefault(), obj);
    }

    static extend(...quads) {
        return Quad.createFromObject(Object.assign({}, ...quads));
    }

    static hasAnyValue(q) {
        return q.bottomLeft || q.bottomRight || q.upperLeft || q.upperRight;
    }

    static Default: Quad;
}
Object.assign(Quad.prototype, defaults);

Quad.Default = Quad.createFromObject({});