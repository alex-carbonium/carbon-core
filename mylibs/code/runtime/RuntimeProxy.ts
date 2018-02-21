import { IProxySource, IRuntimeMixin, IDisposable } from "carbon-core";
import { IUIElement } from "carbon-model";
import PropertyMetadata from "framework/PropertyMetadata";
import { EventNames } from "../runtime/EventNames";
import { Property } from "../runtime/Property";
import UIElement from "framework/UIElement";
import { MixinFactory } from "./MixinFactory";

const eventsMap = Object.getOwnPropertyNames(Object.getPrototypeOf(EventNames)).reduce((t, p) => { t[p.toLowerCase()] = true; return t; }, {});

export class RuntimeProxy implements IDisposable {
    protected element: IProxySource;
    private mixins: IRuntimeMixin[] = [];
    private static proxyMap = new WeakMap();
    private static sourceMap = new WeakMap();
    private methodMap: { [name: string]: boolean } = {};
    private propertyMap: { [name: string]: boolean } = {};
    private rpropertyMap: { [name: string]: boolean } = {};

    dispose() {
        this.mixins.forEach(m => m.dispose());
    }

    static unwrap<T>(proxy: T): T {
        if (proxy && (proxy as any).__isProxy) {
            return RuntimeProxy.proxyMap.get(proxy as any);
        }

        return proxy;
    }

    static wrap(source: any): any {
        if (!source || typeof source !== 'object') {
            return source;
        }

        if (Array.isArray(source)) {
            source = source.slice();
            for (var i = 0; i < source.length; ++i) {
                source[i] = RuntimeProxy.wrap(source[i]);
            }
            return source;
        }

        let proxy = RuntimeProxy.sourceMap.get(source);
        if (proxy) {
            return proxy;
        }

        if (source.proxyDefinition) {
            if (source instanceof UIElement) {
                return ElementProxy.createForElement(source.name, source);
            }
            return RuntimeProxy.create(source);
        }

        return source;
    }

    static clear(): void {
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
        if (proxy) {
            proxy.dispose();
            RuntimeProxy.proxyMap.delete(proxy);
        }
    }

    static create(source: IProxySource) {
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
        for (var mixin of proxyDef.mixins) {
            this.mixins.push(MixinFactory.createForElement(mixin, this.element as any));
        }
    }

    get(target: any, name: string) {
        if (name === '__isProxy') {
            return true;
        }

        if (name === 'dispose') {
            return this.dispose.bind(this);
        }

        for (var mixin of this.mixins) {
            let res = mixin.get(target, name);
            if (res) {
                return RuntimeProxy.wrap(res);
            }
        }

        if (this.propertyMap[name] || this.rpropertyMap[name]) {
            let res = this.element[name];
            return RuntimeProxy.wrap(res);
        }

        if (this.methodMap[name]) {
            const origMethod = this.element[name];

            // interceptor function to unwrap parameters and wrap result
            return function (...args) {
                for (var i = 0; i < args.length; ++i) {
                    args[i] = RuntimeProxy.unwrap(args[i]);
                }
                let res = origMethod.apply(RuntimeProxy.unwrap(this), args);
                return RuntimeProxy.wrap(res);
            }
        }

        throw `Unsupported call ${name}`;
    }

    set(target: any, name: PropertyKey, value: any) {
        let unwrappedValue = RuntimeProxy.unwrap(value);

        for (var mixin of this.mixins) {
            let res = mixin.set(target, name, unwrappedValue);
            if (res) {
                return true;
            }
        }

        if (!this.propertyMap[name]) {
            if (this.rpropertyMap[name]) {
                throw new TypeError(`Readonly property ${name}`);
            }

            throw new TypeError(`Unknown property ${name}`);
        }

        this.element[name] = unwrappedValue;

        return true;
    }

    has(target: any, name: string) {
        for (var mixin of this.mixins) {
            if (mixin.has(target, name)) {
                return true;
            }
        }
        return this.methodMap[name] || this.propertyMap[name] || this.rpropertyMap[name];
    }
}

export class ElementProxy extends RuntimeProxy {
    static createForElement(name: string, source: IProxySource) {
        let proxy = new Proxy(source, new ElementProxy(source));
        RuntimeProxy.register(source, proxy);

        return proxy;
    }

    set(target: any, name: PropertyKey, value: any) {
        if (eventsMap[name.toString().toLowerCase()]) {
            (this.element as any).registerEventHandler(name.toString().substr(2), value);
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