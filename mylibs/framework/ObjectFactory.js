import TypeDefaults from "./TypeDefaults";
import ModelStateListener from "./sync/ModelStateListener";
import PropertyMetadata from "./PropertyMetadata";
import EventHelper from "./EventHelper";
import logger from "../logger";
import Matrix from "../math/matrix";
import Rect from "../math/rect";

var ObjectFactory = {
    objectCreationFailed: EventHelper.createEvent(),

    construct: function(type){
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

        var args = Array.prototype.slice.call(arguments);
        args.splice(0, 1);
        var instance = Object.create(current.prototype);
        current.apply(instance, args);
        return instance;
    },

    fromType: function (type, parameters) {
        var current = sketch;
        if (typeof type === "string") {
            var typeMetadata = PropertyMetadata.findAll(type);
            if (typeMetadata && typeMetadata._class) {
                current = typeMetadata._class;
            }
            if (current === sketch) {
                var components = type.split('.');

                for (var i = 1; i < components.length; i++) {
                    var component = components[i];
                    current = current[component];
                    if (!current) {
                        throw 'Type not found: ' + type;
                    }
                }
            }
        } else {
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
    },
    fromJSON: function(data){
        if (data.t === null) {
            throw 'Invalid data, type is not specified';
        }

        try {
            ModelStateListener.stop();
            var element = this.fromType(data.t);
            element.__state = 1;
            element.fromJSON(data);
            delete element.__state;
        } catch (e) {
            logger.error("Corrupted element in ObjectFactory.fromJSON", e);
            var args = {newObject: null, data};
            this.objectCreationFailed.raise(args);
            if (args.newObject){
                return args.newObject;
            }
            throw new Error("Could not create object from " + JSON.stringify(data));
        }
        finally {
            ModelStateListener.start();
        }

        return element;
    },
    isMaterialized(object) {
        return (Object.getPrototypeOf(object) !== Object.prototype);
    },
    getObject: function(data) {
        if(!data) {
            return data;
        }

        if(!ObjectFactory.isMaterialized(data)) {
            return ObjectFactory.fromJSON(data);
        }

        return data;
    },
    tryUpdateWithPrototype: function (props, name) {
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
    },
    updatePropsWithPrototype: function(props){
        for (var name in props){
            if (props.hasOwnProperty(name)){
                this.tryUpdateWithPrototype(props, name);
            }
        }
    }
}

export default ObjectFactory;