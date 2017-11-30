import { IProxySource } from "carbon-app";

export class ModelFactoryClass implements IProxySource {
    proxyDefinition() {
        return {
            props:[],
            rprops:[],
            methods:["createProperty", "createEvent"]
        }
    }

    createProperty() {
        return {};
    }

    createEvent() {
        return {}
    }
}

export var ModelFactory = new ModelFactoryClass();