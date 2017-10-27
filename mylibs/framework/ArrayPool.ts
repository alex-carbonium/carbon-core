import { pushAll } from "../util";

export default class ArrayPool {
    private static objects: any[][] = new Array(50);

    public static EmptyArray = Object.freeze([]) as any[];

    static allocate<T = any>(): T[] {
        for (let i = 0; i < ArrayPool.objects.length; i++) {
            let obj = ArrayPool.objects[i];
            if (obj) {
                ArrayPool.objects[i] = null;
                return obj;
            }
        }

        return [];
    }

    static allocateFromArray<T = any>(array: T[]): T[] {
        let result = ArrayPool.allocate();
        pushAll(result, array);
        return result;
    }

    static free(obj: any[]) {
        obj.length = 0;

        for (let i = 0; i < ArrayPool.objects.length; i++) {
            if (!ArrayPool.objects[i]) {
                ArrayPool.objects[i] = obj;
                break;
            }
        }
    }
}