import { IDecoratable } from "carbon-core";

export default class DecoratableChain {
    public static invoke(target: IDecoratable, method: string, args: any[], callOnSelf = true) {
        for (let decorator of target.decorators) {
            let targetMethod = decorator[method]
            if (typeof targetMethod === 'function') {
                if (false === targetMethod.apply(decorator, args)) {
                    return;
                }
            }
        }
        if (callOnSelf) {
            let targetMethod = target[method]
            if (typeof targetMethod === 'function') {
                targetMethod.apply(target, args);
            }
        }
    }
}