import { IPooledObject } from "carbon-core";

/**
 * It's a common scenario that certain operation needs to change property multiple times.
 * For example, resizing an object must set a new boundary rect on each mouse move.
 * With a pair of pooled objects, it's possible to allocate only two objects and simply swap them
 * on each iteration.
 *
 * Example:
 *  mousedown() {
 *      this._pair = Rect.createPair();
 *  }
 *  mousemove() {
 *      let newRect = this._pair.swap();
 *      newRect.x = 100;
 *      this.element.boundaryRect(newRect);
 *  }
 *
 * The drawback of such approach is that if someone else holds a reference to the pooled object,
 * it must refresh this reference every time the source changes. Which is typically the case.
 */
export class PooledPair<T extends IPooledObject> {
    private objects: T[];
    private index: number;

    constructor(factory: () => T) {
        this.objects = [factory(), factory()];
        this.index = 0;
    }

    swap(): T {
        this.index = (this.index + 1) % this.objects.length;
        let obj = this.objects[this.index];
        obj.reset();
        return obj;
    }
}