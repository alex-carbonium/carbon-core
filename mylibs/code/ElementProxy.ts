import { IUIElement } from "carbon-model";
import PropertyMetadata from "framework/PropertyMetadata";
import { EventNames } from "./runtime/EventNames";
import { RuntimeProxy } from "./runtime/RuntimeProxy";
import { IProxySource } from "carbon-core";

const eventsMap = EventNames

export class ElementProxy extends RuntimeProxy {

    static create(source:IProxySource) {
        let proxy = new Proxy(source, new ElementProxy(source));
        RuntimeProxy.register(source, proxy);
        return proxy;
    }

    set(target: any, name: PropertyKey, value: any) {
        if (eventsMap[name]) {
            (this.element as any).registerEventHandler(name, value);
            return true;
        }

        return super.set(target, name, value);
    }

    // has(target:any, name:string) {
    //     let exports = (this.element as any).exports;
    //     if(exports && exports[name]) {
    //         return true;
    //     }

    //     return super.has(target, name);
    // }
}