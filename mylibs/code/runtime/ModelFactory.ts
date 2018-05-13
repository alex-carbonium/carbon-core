import { IProxySource } from "carbon-app";
import { Property } from "./Property";
import { Event } from "./Event";
import { ISize } from "carbon-geometry";
import { Model } from "../../framework/Model";
import Brush from "../../framework/Brush";
import Matrix from "math/matrix";
import Environment from "environment";
import { IArtboard } from "carbon-core";

function EventData(props) {
    Object.assign(this, props);
}

EventData.prototype.preventDefault = function preventDefault() {
    this._preventDefault = true;
}

EventData.prototype.stopPropagation = function stopPropagation() {
    this._stopPropagation = true;
}

EventData.prototype.isDefaultPrevented = function isDefaultPrevented() {
    return !!this._preventDefault;
}

EventData.prototype.isPropagationStopped = function isPropagationStopped() {
    return !!this._stopPropagation;
}

var model = new Model();
export class ModelFactory implements IProxySource {
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
                "createPath",
                "createArtboardFrame"
            ],
            mixins: []
        }
    }

    constructor(private runCodeOnArtboardCallback:(a:IArtboard)=>Promise<void>) {

    }

    createProperty<T>(getter: () => T, setter?: (value: T) => void) {
        return Object.freeze(new Property<T>(getter, setter));
    }

    createEvent() {
        return Object.freeze(new Event());
    }

    createText(props?: any): any {
        props = props || {}
        let size = { width: props.width | 0, height: props.height | 0 };
        props = ModelFactory._prepareProps(props);

        return model.createText(size, props);
    }
    createImage(props?: any): any {
        props = props || {}
        let size = { width: props.width | 0, height: props.height | 0 };
        props = ModelFactory._prepareProps(props);
        return model.createImage(size, props);
    }
    createRectangle(props?: any): any {
        props = props || {}
        let size = { width: props.width | 0, height: props.height | 0 };
        props = ModelFactory._prepareProps(props);
        return model.createRectangle(size, props);
    }
    createOval(props?: any): any {
        props = props || {}
        let size = { width: props.width | 0, height: props.height | 0 };
        props = ModelFactory._prepareProps(props);
        return model.createOval(size, props);
    }
    createStar(props?: any): any {
        props = props || {}
        let size = { width: props.width | 0, height: props.height | 0 };
        props = ModelFactory._prepareProps(props);
        return model.createStar(size, props);
    }
    createPath(props?: any): any {
        props = props || {}
        let size = { width: props.width | 0, height: props.height | 0 };
        props = ModelFactory._prepareProps(props);
        return model.createPath(props.points, size, props);
    }

    createEventData(data: any) {
        return ModelFactory.createEventData(data);
    }

    static createEventData(data: any) {
        return new EventData(data);
    }

    createArtboardFrame(props?: any): Promise<any> {
        props = props || {}
        let size = { width: props.width | 0, height: props.height | 0 };
        props = ModelFactory._prepareProps(props);
        let name = props.artboardName;
        delete props.artboardName
        let frame = model.createArtboardFrame(name, size, props);

        return this.runCodeOnArtboardCallback((frame as any).innerElement).then(() => frame);
        // let previewModel = (Environment.controller as any).previewModel;
        // if (previewModel) {
        //     return previewModel.runCodeOnArtboard((frame as any).innerElement).then(() => frame);
        // }

        // return Promise.resolve(frame);
    }

    static _prepareProps(props) {
        props = Object.assign({}, props);
        if (props.fill && (typeof props.fill === 'string')) {
            props.fill = Brush.createFromCssColor(props.fill);
        }
        if (props.stroke && (typeof props.stroke === 'string')) {
            props.stroke = Brush.createFromCssColor(props.stroke);
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
