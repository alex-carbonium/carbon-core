import { IProxySource } from "carbon-app";
import { Property } from "./Property";
import { Event } from "./Event";
import * as Runtime from "carbon-runtime";
import { ISize } from "carbon-geometry";
import { Model } from "../../framework/Model";
import Brush from "../../framework/Brush";
import Matrix from "math/matrix";

var model = new Model();
export class ModelFactoryClass implements IProxySource {
    proxyDefinition() {
        return {
            props: [],
            rprops: [],
            methods: [
                "createProperty",
                "createEvent",
                "createText",
                "createImage",
                "createRectangle",
                "createOval",
                "createStar",
                "createPath"
            ],
            mixins:[]
        }
    }

    createProperty<T>(getter: () => T, setter?: (value: T) => void) {
        return Object.freeze(new Property<T>(getter, setter));
    }

    createEvent() {
        return Object.freeze(new Event());
    }

    createText(props?: any): any {
        props = props || {}
        let size = { width: props.width | 0, height:props.height|0 };
        props = ModelFactory._prepareProps(props);

        return model.createText(size, props);
    }
    createImage(props?: any): any {
        props = props || {}
        let size = { width: props.width | 0, height:props.height|0 };
        props = ModelFactory._prepareProps(props);
        return model.createImage(size, props);
    }
    createRectangle(props?: any): any {
        props = props || {}
        let size = { width: props.width | 0, height:props.height|0 };
        props = ModelFactory._prepareProps(props);
        return model.createRectangle(size, props);
    }
    createOval(props?: any): any {
        props = props || {}
        let size = { width: props.width | 0, height:props.height|0 };
        props = ModelFactory._prepareProps(props);
        return model.createOval(size, props);
    }
    createStar(props?: any): any {
        props = props || {}
        let size = { width: props.width | 0, height:props.height|0 };
        props = ModelFactory._prepareProps(props);
        return model.createStar(size, props);
    }
    createPath(props?: any): any {
        props = props || {}
        let size = { width: props.width | 0, height:props.height|0 };
        props = ModelFactory._prepareProps(props);
        return model.createPath(props.points, size, props);
    }

    _prepareProps(props) {
        props = Object.assign({}, props);
        if (props.fill && (typeof props.fill === 'string')) {
            props.fill = Brush.createFromColor(props.fill);
        }
        if (props.stroke && (typeof props.stroke === 'string')) {
            props.stroke = Brush.createFromColor(props.stroke);
        }
        props.__temp = true;
        props.m = Matrix.createTranslationMatrix(props.x | 0, props.y | 0);

        delete props.width;
        delete props.height;
        delete props.x;
        delete props.y;

        return props;
    }
}

export var ModelFactory = new ModelFactoryClass();