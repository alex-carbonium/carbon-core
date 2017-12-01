import { IProxySource } from "carbon-app";
import { Property } from "./Property";

export class ModelFactoryClass implements IProxySource {
    proxyDefinition() {
        return {
            props:[],
            rprops:[],
            methods:["createProperty", "createEvent"]
        }
    }

    createProperty<T>(getter:()=>T, setter?:(value:T)=>void) {
        return Object.freeze(new Property<T>(getter, setter));
    }

    createEvent() {
        return {}
    }
}

export var ModelFactory = new ModelFactoryClass();