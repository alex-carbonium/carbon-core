import { PropDescriptor } from "carbon-core";

var PropertyMetadata: any = {};
PropertyMetadata._store = {};
PropertyMetadata._defaults = {};
PropertyMetadata._cache = {
    stylePropertyNamesMap: {}
};

PropertyMetadata.find = function(type: string, propertyName: string): PropDescriptor{
    var typeData = PropertyMetadata._store[type];
    if (!typeData){
        return null;
    }
    var propertyData = typeData[propertyName];
    if (!propertyData){
        return null;
    }
    propertyData.name = propertyName;
    return propertyData;
};
PropertyMetadata.findAll = function(type: string){
    return PropertyMetadata._store[type];
};
PropertyMetadata.findForType = function(Type){
    return PropertyMetadata._store[Type.prototype.t];
};

PropertyMetadata.removeNamedType = function(name){
    delete PropertyMetadata._store[name];
};

PropertyMetadata.extend = function(){
    var parent, data;
    if (arguments.length === 1){
        data = arguments[0];
        parent = null;
    }
    else if (arguments.length === 2){
        parent = PropertyMetadata._store[arguments[0]];
        data = arguments[1];
    }

    for (var i in data){
        var props = data[i];
        var desc = {};
        var funcs = {}; //TODO: pass functions as a separate arg
        for (var p in props){
            var prop = props[p];
            if (typeof prop === "function"){
                funcs[p] = prop;
                continue;
            }
            if (parent){
                var parentProp = parent[p];
                if (parentProp){
                    prop = Object.assign({}, parentProp, prop);
                }
            }
            desc[p] = {value: prop, enumerable: true};
        }

        var entry = Object.create(parent, desc);
        Object.assign(entry, funcs);
        PropertyMetadata._store[i] = entry;
    }
};

PropertyMetadata.baseTypeName = function(Type){
    var parent = Object.getPrototypeOf(Type.prototype);
    if (parent){
        return parent.t;
    }
};

PropertyMetadata.registerForType = function(Type, data){
    data._class = Type;

    if (DEBUG){
        if (!Type.prototype.t){
            throw new Error("Type " + Type.name + " must have 'static t' property");
        }
        if (Type.prototype.t.length > 2){
            console.warn("Type with long name: " + Type.prototype.t);
        }
    }

    var parent = Object.getPrototypeOf(Type.prototype);
    if (parent && parent.t){
        this.extend(parent.t, {
            [Type.prototype.t]: data
        });
    }
    else{
        this.extend({[Type.prototype.t]: data});
    }
};


PropertyMetadata.replaceForNamedType = function(name, BaseType, data){
    if (BaseType && BaseType.prototype.t){
        this.extend(BaseType.prototype.t, {
            [name]: data
        });
    }
    else{
        this.extend({[name]: data});
    }
};

PropertyMetadata.getPropsPrototype = function(type){
    var prototype = PropertyMetadata._defaults[type];
    if (!prototype){
        var store = PropertyMetadata._store[type];
        var props = {};
        for (var p in store){
            var meta = store[p];
            if (typeof meta === 'object'){
                var defaultValue = meta.defaultValue;
                if (defaultValue === undefined){
                    props[p] = null;
                } else{
                    props[p] = defaultValue;
                }
            }
        }
        prototype = props;
        PropertyMetadata._defaults[type] = prototype;
    }
    return prototype;
};
PropertyMetadata.getDefaultTypeProps = function(Type){
    return this.getPropsPrototype(Type.prototype.t);
};

PropertyMetadata.getDefaultProps = function(type){
    var prototype = PropertyMetadata.getPropsPrototype(type);
    return Object.create(prototype);
};

PropertyMetadata.getEditableProperties = function(type, recursive){
    var res = [];
    var store = PropertyMetadata._store[type];
    for (var p in store){
        if (store[p].editable){
            res.push(p);
        }
    }
    return res;
}

PropertyMetadata.getCustomizableProperties = function(type){
    var res = [];
    var store = PropertyMetadata._store[type];
    for (var p in store){
        var prop = store[p];
        if (prop.customizable){
            res.push({name: p, property: prop});
        }
    }
    return res;
}

PropertyMetadata.getStylePropertyNamesMap = function(type, styleType){
    var res = PropertyMetadata._cache.stylePropertyNamesMap[type + styleType];

    if (!res){
        res = {};
        var store = PropertyMetadata._store[type];
        for (var p in store){
            if (store[p].style === styleType){
                res[p] = true;
            }
        }
        PropertyMetadata._cache.stylePropertyNamesMap[type + styleType] = res;
    }
    return res;
}

export default PropertyMetadata;