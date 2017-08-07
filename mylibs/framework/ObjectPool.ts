import { IPooledObject } from "carbon-core";

export default class ObjectPool<T extends IPooledObject> {
    private objects: T[];

    constructor(private factory: () => T, size: number = 50) {
        this.objects = new Array(size);
    }

    allocate(): T {
        for (let i = 0; i < this.objects.length; i++) {
            let obj = this.objects[i];
            if (obj) {
                this.objects[i] = null;
                return obj;
            }
        }

        return this.factory();
    }

    free(obj: T) {
        obj.reset();

        for (let i = 0; i < this.objects.length; i++) {
            if (!this.objects[i]) {
                this.objects[i] = obj;
                break;
            }
        }
    }
}