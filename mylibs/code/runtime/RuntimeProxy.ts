import { IProxySource } from "carbon-core";



export class RuntimeProxy {
    protected element: IProxySource;
    private static proxyMap = new WeakMap();
    private methodMap: { [name: string]: boolean } = {};
    private propertyMap: { [name: string]: boolean } = {};
    private rpropertyMap: { [name: string]: boolean } = {};

    static unwrap<T>(proxy:T):T {
        if((proxy as any).__isProxy) {
            return RuntimeProxy.proxyMap.get(proxy as any);
        }

        return proxy;
    }

    static register(source, proxy) {
        RuntimeProxy.proxyMap.set(proxy, source);
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

        if (this.methodMap[name] || this.propertyMap[name] || this.rpropertyMap[name]) {
            return this.element[name];
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

        this.element[name] = value;

        return true;
    }

    has(target: any, name: string) {
        return this.methodMap[name] || this.propertyMap[name] || this.rpropertyMap[name];
    }
}