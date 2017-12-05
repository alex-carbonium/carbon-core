import { IProxySource } from "carbon-core";
import { IUIElement } from "carbon-model";
import PropertyMetadata from "framework/PropertyMetadata";
import { EventNames } from "../runtime/EventNames";
import { Property } from "../runtime/Property";
import UIElement from "framework/UIElement";

export class RuntimeProxy {
    protected element: IProxySource;
    private static proxyMap = new WeakMap();
    private static sourceMap = new WeakMap();
    private methodMap: { [name: string]: boolean } = {};
    private propertyMap: { [name: string]: boolean } = {};
    private rpropertyMap: { [name: string]: boolean } = {};

    static unwrap<T>(proxy:T):T {
        if((proxy as any).__isProxy) {
            return RuntimeProxy.proxyMap.get(proxy as any);
        }

        return proxy;
    }

    static wrap(source:any):any {
        if(typeof source !== 'object') {
            return source;
        }

        let proxy = RuntimeProxy.sourceMap.get(source);
        if(proxy) {
            return proxy;
        }

        if(source.proxyDefinition) {
            if(source instanceof UIElement) {
                return ElementProxy.createForElement(source.name, source);
            }
            return RuntimeProxy.create(source);
        }

        return source;
    }

    static clear():void {
        RuntimeProxy.proxyMap = new WeakMap();
        RuntimeProxy.sourceMap = new WeakMap();
    }

    static register(source, proxy) {
        RuntimeProxy.proxyMap.set(proxy, source);
        RuntimeProxy.sourceMap.set(source, proxy);
    }

    static release(source) {
        let proxy = RuntimeProxy.sourceMap.get(source);
        RuntimeProxy.sourceMap.delete(source);
        if(proxy) {
            RuntimeProxy.proxyMap.delete(proxy);
        }
    }

    static create(source:IProxySource) {
        let proxy = new Proxy(source, new RuntimeProxy(source));
        RuntimeProxy.register(source, proxy);
        return proxy;
    }

    constructor(element: IProxySource) {
        this.element = element;

        var proxyDef = element.proxyDefinition();
        if (proxyDef) {
            proxyDef.methods && proxyDef.methods.forEach((v) => {
                this.methodMap[v] = true;
            });
            proxyDef.props && proxyDef.props.forEach((v) => {
                this.propertyMap[v] = true;
            });
            proxyDef.rprops && proxyDef.rprops.forEach((v) => {
                this.rpropertyMap[v] = true;
            });
        }
    }

    get(target: any, name: string) {
        if(name === '__isProxy') {
            return true;
        }

        if (this.propertyMap[name] || this.rpropertyMap[name]) {
            let res = this.element[name];
            return RuntimeProxy.wrap(res);
        }

        if (this.methodMap[name]) {
            const origMethod = this.element[name];
            return function (...args) {
                for(var i = 0; i < args.length; ++i) {
                    args[i] = RuntimeProxy.unwrap(args[i]);
                }
                let res = origMethod.apply(RuntimeProxy.unwrap(this), args);
                return RuntimeProxy.wrap(res);
            }
        }

        throw `Unsupported call ${name}`;
    }

    set(target: any, name: PropertyKey, value: any) {
        if (!this.propertyMap[name]) {
            if (this.rpropertyMap[name]) {
                throw new TypeError(`Readonly property ${name}`);
            }

            throw new TypeError(`Unknown property ${name}`);
        }

        this.element[name] = RuntimeProxy.unwrap(value);

        return true;
    }

    has(target: any, name: string) {
        return this.methodMap[name] || this.propertyMap[name] || this.rpropertyMap[name];
    }
}


const eventsMap = EventNames
let proxiesMap: { [name: string]: IUIElement } = {};

export class ElementProxy extends RuntimeProxy {
    static createForElement(name:string, source: IProxySource) {
        let proxy = new Proxy(source, new ElementProxy(source));
        RuntimeProxy.register(source, proxy);
        proxiesMap[name] = proxy;
        return proxy;
    }

    static tryGet(name:string) {
        return proxiesMap[name];
    }

    static clear() {
        proxiesMap = {};
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
                (this.element as any).runtimeProps.runtimeData[name].registerHandler(value);
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