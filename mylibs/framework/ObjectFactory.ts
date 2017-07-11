import TypeDefaults from "./TypeDefaults";
import ModelStateListener from "./relayout/ModelStateListener";
import PropertyMetadata from "./PropertyMetadata";
import EventHelper from "./EventHelper";
import logger from "../logger";
import Matrix from "../math/matrix";
import Rect from "../math/rect";

export default class ObjectFactory {
    static objectCreationFailed = EventHelper.createEvent();

    static construct(type, ...args){
        var current;
        if (typeof type === "string") {
            var typeMetadata = PropertyMetadata.findAll(type);
            if (typeMetadata && typeMetadata._class) {
                current = typeMetadata._class;
            }
        } else {
            current = type;
        }

        if (!current) {
            throw "Type not found: " + type;
        }

        var newArgs = Array.prototype.slice.call(arguments);
        newArgs.splice(0, 1);
        var instance = Object.create(current.prototype);
        current.apply(instance, newArgs);
        return instance;
    }

    static fromType(type, parameters?) {
        var current = null;
        if (typeof type === "string") {
            var typeMetadata = PropertyMetadata.findAll(type);
            if (typeMetadata && typeMetadata._class) {
                current = typeMetadata._class;
            }
        }
        else {
            current = type;
        }

        var defaultFunc = TypeDefaults[type];
        if (defaultFunc) {
            var defaults = defaultFunc();
            parameters = Object.assign(defaults, parameters);
        }

        var res;
        if (typeof current !== 'function') {
            return parameters;
        }
        res = new current();

        if (parameters !== undefined && typeof res.setProps === 'function') {
            res.setProps(parameters);
        }

        return res;
    }
    static fromJSON<T>(data){
        if (data.t === null) {
            throw 'Invalid data, type is not specified';
        }

        try {
            ModelStateListener.stop();
            var element = ObjectFactory.fromType(data.t);
            element.__state = 1;
            element.fromJSON(data);
            delete element.__state;
        } catch (e) {
            logger.error("Corrupted element in ObjectFactory.fromJSON", e);
            var args = {newObject: null, data};
            ObjectFactory.objectCreationFailed.raise(args);
            if (args.newObject){
                return args.newObject;
            }
            throw new Error("Could not create object from " + JSON.stringify(data));
        }
        finally {
            ModelStateListener.start();
        }

        return element;
    }
    static isMaterialized(object) {
        return (Object.getPrototypeOf(object) !== Object.prototype);
    }
    static getObject<T>(data: object) {
        if(!data) {
            return data;
        }

        if(!ObjectFactory.isMaterialized(data)) {
            return ObjectFactory.fromJSON<T>(data);
        }

        return data;
    }
    static tryUpdateWithPrototype(props, name) {
        var value = props[name];
        if (value && value.t) {
            var type = value.t;
            var defaultFunc = TypeDefaults[type];
            var defaults = {};
            if (defaultFunc) {
                defaults = defaultFunc();
            }
            value = Object.assign(defaults, value);

            props[name] = value;
        }
        else if (name === "m" || ( value && name.endsWith(':m'))){
            props[name] = Matrix.fromObject(value);
        }
        else if (name === "br" || (value && name.endsWith(':br'))){
            props[name] = Rect.fromObject(value);
        }
    }
    static updatePropsWithPrototype(props){
        for (var name in props){
            if (props.hasOwnProperty(name)){
                ObjectFactory.tryUpdateWithPrototype(props, name);
            }
        }
    }
}