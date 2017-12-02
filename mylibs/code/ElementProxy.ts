import { IUIElement } from "carbon-model";
import PropertyMetadata from "framework/PropertyMetadata";
import { EventNames } from "./runtime/EventNames";
import { RuntimeProxy } from "./runtime/RuntimeProxy";
import { IProxySource } from "carbon-core";
import { Property } from "./runtime/Property";

const eventsMap = EventNames

export class ElementProxy extends RuntimeProxy {

    static create(source: IProxySource) {
        let proxy = new Proxy(source, new ElementProxy(source));
        RuntimeProxy.register(source, proxy);
        return proxy;
    }

    set(target: any, name: PropertyKey, value: any) {
        if (eventsMap[name]) {
            (this.element as any).registerEventHandler(name, value);
            return true;
        }

        let exports = (this.element as any).exports;

        if (exports && exports[name]) {
            let type = exports[name];
            if (type.startsWith("Property")) {
                let propInstance = (this.element as any).runtimeProps.runtimeData[name];
                if (propInstance instanceof Property && Object.isFrozen(propInstance)) {
                    propInstance.set(value);
                }
            } else if (type.startsWith("Event")) {
                (this.element as any).runtimeProps.runtimeData[name].registerHandler(type);
            }

            return true;
        }

        return super.set(target, name, value);
    }

    get(target: any, name: string) {
        let exports = (this.element as any).exports;
        if (exports && exports[name]) {
            let value = exports[name];
            if (value.startsWith("Property")) {
                let propInstance = (this.element as any).runtimeProps.runtimeData[name];
                if (propInstance instanceof Property && Object.isFrozen(propInstance)) {
                    return propInstance.get();
                }
            }
        }

        return super.get(target, name);
    }

    has(target: any, name: string) {
        let exports = (this.element as any).exports;
        if (exports && exports[name]) {
            return true;
        }

        return super.has(target, name);
    }
}