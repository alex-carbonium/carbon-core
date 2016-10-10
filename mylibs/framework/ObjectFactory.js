import TypeDefaults from "./TypeDefaults";
import ModelStateListener from "./sync/ModelStateListener";
import PropertyMetadata from "./PropertyMetadata";
import ObjectCache from "./ObjectCache";
import EventHelper from "./EventHelper";
import logger from "../logger";

export default {
    objectCreationFailed: EventHelper.createEvent(),

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
        if (ObjectCache.instance.supportsType(type)) {
            var key = current.hashKey(parameters);
            res = ObjectCache.instance.getOrPut(type, key, function () {
                return new current(parameters);
            });
        }
        else {
            if (typeof current !== 'function') {
                return parameters;
            }
            res = new current();

            if (parameters !== undefined && typeof res.setProps === 'function') {
                res.setProps(parameters);
            }
        }


        return res;
    },
    fromJSON: function(data){
        if (data.type === null) {
            throw 'Invalid data, type is not specified';
        }

        try {
            ModelStateListener.stop();
            var element = this.fromType(data.type);
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
    tryUpdateWithPrototype: function (props, name) {
        var value = props[name];
        if (value && value.__type__) {
            var type = value.__type__;
            var defaultFunc = TypeDefaults[type];
            var defaults = {};
            if (defaultFunc) {
                defaults = defaultFunc();
            }
            value = Object.assign(defaults, value);

            //if (type.startsWith("sketch.framework.ImageSource")) {
            //    fwk.ImageSource.init(value).then(function (v) {
            //        var obj = {};
            //        obj[name] = v;
            //        owner.setProps(obj);
            //    });
            //}
            props[name] = value;
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