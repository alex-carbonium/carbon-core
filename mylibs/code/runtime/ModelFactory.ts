import { IProxySource } from "carbon-app";
import { Property } from "./Property";
import { Event } from "./Event";

export class ModelFactoryClass implements IProxySource {
    proxyDefinition() {
        return {
            props: [],
            rprops: [],
            methods: ["createProperty", "createEvent"]
        }
    }

    createProperty<T>(getter: () => T, setter?: (value: T) => void) {
        return Object.freeze(new Property<T>(getter, setter));
    }

    createEvent() {
        return Object.freeze(new Event());
    }
}

export var ModelFactory = new ModelFactoryClass();