define(["framework/validation/Int", "framework/validation/MinMax"], function (IntValidator, MinMaxValidator) {
    var fwk = sketch.framework;

    fwk.PropertyMetadata = {};
    fwk.PropertyMetadata._store = {};
    fwk.PropertyMetadata._defaults = {};
    fwk.PropertyMetadata._validatorsCache = {};
    fwk.PropertyMetadata._cache = {
        stylePropertyNamesMap:{}
    };

    fwk.PropertyMetadata.find = function (type, propertyName) {
        var typeData = fwk.PropertyMetadata._store[type];
        if (!typeData) {
            return null;
        }
        var propertyData = typeData[propertyName];
        if (!propertyData) {
            return null;
        }
        propertyData.name = propertyName;
        return propertyData;
    };
    fwk.PropertyMetadata.findAll = function (type) {
        return fwk.PropertyMetadata._store[type];
    };
    fwk.PropertyMetadata.findForType = function (Type) {
        return fwk.PropertyMetadata._store[Type.prototype.__type__];
    };

    fwk.PropertyMetadata.removeNamedType = function (name) {
        delete fwk.PropertyMetadata._store[name];
    };

    fwk.PropertyMetadata.extend = function () {
        var parent, data;
        if (arguments.length === 1) {
            data = arguments[0];
            parent = null;
        }
        else if (arguments.length === 2) {
            parent = fwk.PropertyMetadata._store[arguments[0]];
            data = arguments[1];
        }

        for (var i in data) {
            var props = data[i];
            var desc = {};
            var funcs = {}; //TODO: pass functions as a separate arg
            for (var p in props) {
                var prop = props[p];
                if (typeof prop === "function") {
                    funcs[p] = prop;
                    continue;
                }
                if (parent) {
                    var parentProp = parent[p];
                    if (parentProp) {
                        prop = Object.assign({}, parentProp, prop);
                    }
                }
                desc[p] = {value: prop, enumerable: true};
            }
            var entry = Object.create(parent, desc);
            Object.assign(entry, funcs);
            fwk.PropertyMetadata._store[i] = entry;
        }
    };

    fwk.PropertyMetadata.baseTypeName = function (Type) {
        var parent = Object.getPrototypeOf(Type.prototype);
        if (parent) {
            return parent.__type__;
        }
    };

    fwk.PropertyMetadata.registerForType = function (Type, data) {
        data._class = Type;

        var parent = Object.getPrototypeOf(Type.prototype);
        if (parent && parent.__type__) {
            this.extend(parent.__type__, {
                [Type.prototype.__type__]: data
            });
        }
        else {
            this.extend({[Type.prototype.__type__]: data});
        }
    };



    fwk.PropertyMetadata.replaceForNamedType = function (name, BaseType, data) {
        if (BaseType && BaseType.prototype.__type__) {
            this.extend(BaseType.prototype.__type__, {
                [name]: data
            });
        }
        else {
            this.extend({[name]: data});
        }
    };

    fwk.PropertyMetadata.getPropsPrototype = function (type) {
        var prototype = fwk.PropertyMetadata._defaults[type];
        if (!prototype) {
            var store = fwk.PropertyMetadata._store[type];
            var props = {};
            for (var p in store) {
                var meta = store[p];
                if (typeof meta === 'object') {
                    var defaultValue = meta.defaultValue;
                    if (defaultValue === undefined) {
                        props[p] = null;
                    } else {
                        props[p] = defaultValue;
                    }
                }
            }
            prototype = props;
            fwk.PropertyMetadata._defaults[type] = prototype;
        }
        return prototype;
    };
    fwk.PropertyMetadata.getDefaultTypeProps = function (Type) {
        return this.getPropsPrototype(Type.prototype.__type__);
    };

    fwk.PropertyMetadata.getDefaultProps = function (type) {
        var prototype = fwk.PropertyMetadata.getPropsPrototype(type);
        return Object.create(prototype);
    };

    fwk.PropertyMetadata.getEditableProperties = function (type, recursive) {
        var res = [];
        var store = fwk.PropertyMetadata._store[type];
        for (var p in store) {
            if (store[p].editable) {
                res.push(p);
            }
        }
        return res;
    }

    fwk.PropertyMetadata.getCustomizableProperties = function (type) {
        var res = [];
        var store = fwk.PropertyMetadata._store[type];
        for (var p in store) {
            var prop = store[p];
            if (prop.customizable) {
                res.push({name:p, property:prop});
            }
        }
        return res;
    }

    fwk.PropertyMetadata.getStylePropertyNamesMap = function (type, styleType) {
        var res = fwk.PropertyMetadata._cache.stylePropertyNamesMap[type + styleType];

        if(!res) {
            res = {};
            var store = fwk.PropertyMetadata._store[type];
            for (var p in store) {
                if (store[p].style === styleType) {
                    res[p] = true;
                }
            }
            fwk.PropertyMetadata._cache.stylePropertyNamesMap[type + styleType] = res;
        }
        return res;
    }

    fwk.PropertyMetadata.getValidator = function (key) {
        var validator = fwk.PropertyMetadata._validatorsCache[key];
        if (!validator) {
            switch (key) {
                case "int":
                    validator = new IntValidator();
                    break;
                case "minMax":
                    validator = new MinMaxValidator();
                    break;
            }
            fwk.PropertyMetadata._validatorsCache[key] = validator;
        }
        return validator;
    };
    fwk.PropertyMetadata.getValidators = function (type, propertyName) {
        var result = null;
        var metadata = fwk.PropertyMetadata.find(type, propertyName);
        if (metadata && metadata.validate) {
            result = [];
            for (var i = 0, l = metadata.validate.length; i < l; ++i) {
                var validatorDef = metadata.validate[i];
                var key;
                var initValues;
                if (typeof validatorDef === "string") {
                    key = validatorDef;
                }
                else {
                    for (var k in validatorDef) {
                        key = k;
                        initValues = validatorDef[k];
                        break;
                    }
                }
                var validator = fwk.PropertyMetadata.getValidator(key);
                validator.init.apply(validator, initValues);
                result.push(validator);
            }
        }
        return result;
    };

    return fwk.PropertyMetadata;
});
