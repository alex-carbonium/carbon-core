import { IProxySource } from "carbon-app";
import { ProxyDefinition } from "carbon-core";

export class Property<T> implements IProxySource {
    constructor(private getter: () => T, private setter: (value: T) => void) {
    }

    get():T {
        return this.getter();
    }

    set(value:T):void {
        this.setter(value);
    }

    proxyDefinition(): ProxyDefinition {
        return { props: [], rprops: [], methods: ["get", "set"], mixins:[] }
    }

}