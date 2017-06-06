import { IDecoratable } from "carbon-core";

export default class ExtensionPoint {
    public static invoke(target: IDecoratable, method: string, args: any[]) {
        if (target.decorators) {
            for (let decorator of target.decorators) {
                let targetMethod = decorator.beforeInvoke
                if (typeof targetMethod === 'function') {
                    if (false === targetMethod.call(decorator, method, args)) {
                        return;
                    }
                }
            }
        }

        let targetMethod = target[method]
        if (typeof targetMethod === 'function') {
            targetMethod.apply(target, args);
        }

        if (target.decorators) {
            for (let decorator of target.decorators) {
                let targetMethod = decorator.afterInvoke
                if (typeof targetMethod === 'function') {
                    if (false === targetMethod.call(decorator, method, args)) {
                        return;
                    }
                }
            }
        }
    }
}