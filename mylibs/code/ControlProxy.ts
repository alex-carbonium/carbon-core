import { IUIElement } from "carbon-model";
import PropertyMetadata from "framework/PropertyMetadata";

export class ControlProxy {
    private element: IUIElement;
    private methodMap: { [name: string]: boolean } = {};
    private propertyMap: { [name: string]: boolean } = {};
    private rpropertyMap: { [name: string]: boolean } = {};

    private static proxyMap = {};

    static unwrap<T = IUIElement>(proxy:any):T {
        if(proxy.__isProxy) {
            return ControlProxy.proxyMap[proxy.id]
        }

        return proxy;
    }

    static clear() {
        ControlProxy.proxyMap = [];
    }

    constructor(element: IUIElement) {
        this.element = element;
        ControlProxy.proxyMap[element.id()] = element;

        var metadata = PropertyMetadata.findAll(element.systemType());
        if (metadata.proxyDefinition) {
            let proxyDef = metadata.proxyDefinition();
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
            if (typeof this.element[name] === 'function') {
                return this.element[name]();
            }
            if(name === 'props') {
                return this.element.props;
            }

            return this.element.props[name];
        }

        if (this.methodMap[name]) {
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

        let setter = `_${name}`;
        if (typeof this.element[setter] === 'function') {
            this.element[setter](value);
        }
        else {
            this.element.setProps({ [name]: value });
        }

        return true;
    }

    has(target: any, name: string) {
        return this.methodMap[name] || this.propertyMap[name];
    }
}