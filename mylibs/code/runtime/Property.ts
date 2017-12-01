import { IProxySource } from "carbon-app";

export class Property<T> implements IProxySource {
    constructor(private getter: () => T, private setter: (value: T) => void) {
    }

    get():T {
        return this.getter();
    }

    set(value:T):void {
        this.setter(value);
    }

    proxyDefinition(): { props: string[]; rprops: string[]; methods: string[]; } {
        return { props: [], rprops: [], methods: ["get", "set"] }
    }

}