define(["framework/validation/Callback", "framework/validation/MinMax", "framework/PropertyTypes", "framework/PropertyMetadata", "framework/TypeDefaults"], function(CallbackValidator, MinMaxValidator, PropertyTypes, PropertyMetadata, TypeDefaults) {
    // usings
    var fwk = sketch.framework;

    function createEvent(prop, oldValue, newValue, context) {
        return {
            property:prop.propertyName,
            propertyFullName:prop.getUniqueName(),
            newValue:newValue,
            oldValue:oldValue,
            ok: true,
            changedValue: undefined,
            useInModel:propertyOfProperty(prop, "isUsedInModel", "useInModel"),
            stateless:prop.isStateless,
            prop: prop,
            context:context
        };
    }

    function validateProperty(name) {
        if (!this.data.hasOwnProperty(name)) {
            throw  "property (" + name + ") not found";
        }
    }

    function validatePossibleValues(prop, value) {
        // check if assigned value is one of the possible values
        if (prop._possibleValues != undefined && !prop._skipPossibleValuesValidation) {
            if (!prop._possibleValues.hasOwnProperty(value)) {
                var found = false;
                for (var val in prop._possibleValues) {
                    if (prop._possibleValues[val] === value) {
                        value = val;
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    throw 'Trying to assign not possible value: ' + value;
                }
            }
        }
        return value;
    }

    function iterateProperties(bag, callback, recursive, prefix) {
        if (!bag){
            return;
        }
        for (var i in bag.data) {
            var fullName = prefix;
            var property = bag.data[i];

            if (fullName === undefined) {
                fullName = property.propertyName;
            }
            else {
                fullName += "." + property.propertyName;
            }

            var isComplex = property.isComplex();
            var result = callback(property, isComplex, fullName);

            if (recursive && isComplex && result !== false) {
                iterateProperties(bag.get(property.propertyName), callback, recursive, fullName);
            }
        }
    }

    function bindToParentBagIfNecessary(bag, property, value, oldValue) {
        if (value && value instanceof fwk.Properties) {
            value.bagProperty = property;
        }
    }

    function enabledEventStateChanged(state){
        if (state === "empty"){
            this.enabledEventStateTracker.dispose();
            delete this.enabledEventStateTracker;
            this.enabledEvent.disableStateTracking();
            delete this.enabledEvent;
        }
    }

    function visibilityChangedEventStateChanged(state){
        if (state === "empty"){
            this.visibilityChangedEventStateTracker.dispose();
            delete this.visibilityChangedEventStateTracker;
            this.visibilityChangedEvent.disableStateTracking();
            delete this.visibilityChangedEvent;
        }
    }

    function bindingPoint(event){
        this.value(event.newValue)
    }

    function propertyOfProperty(property, ownName, nameInMetadata){
        if (property.hasOwnProperty(ownName)){
            return property[ownName];
        }
        var metadata = getMetadata(property);
        if (metadata){
            return metadata[nameInMetadata];
        }
        return null;
    }

    function getMetadata(property){
        return PropertyMetadata.find(property.bag.metadataType(), property.propertyName);
    }

    function getEditorTemplate(property){
        if (property.hasOwnProperty("editorTemplateSelector")){
            return property.editorTemplateSelector;
        }

        var metadata = getMetadata(property);
        if (metadata && metadata.type){
            return PropertyTypes[metadata.type].editorTemplate;
        }
        return null;
    }

    klass2("sketch.framework.Property", null, (function(){
        return {
            _constructor:function Property(bag, /*str*/name, /*str*/description, /*T*/defaultValue){
                this.bag = bag;
                this.propertyName = name;
                if (description !== undefined){
                    this.description = description;
                }
                this._value = defaultValue;
                this.defaultValue = defaultValue;

                bindToParentBagIfNecessary(this.bag, this, defaultValue);
            },
            //Checks if value is in possible list
            isValuePossible: function(value){
                try{
                    validatePossibleValues(this, value);
                    return true
                }
                catch(e){
                    return false;
                }
            },
            value:function(/*any*/value, isDefault, context) {
                if (arguments.length > 0 && arguments[0] !== undefined) {
                    if (this.isReadOnly()){
                        throw "Could not set value for readonly property: " + this.getUniqueName();
                    }

                    var oldValue = this._value;

                    var validatedValue = validatePossibleValues(this, value);

                    var event = createEvent(this, oldValue, validatedValue, context);
                    var valueChanged = false;

                    this.validateNewValue(validatedValue, event);
                    if (event.ok) {
                        this._value = validatedValue;
                        valueChanged = true;
                    }
                    else {
                        if (event.changedValue !== undefined){
                            this._value = event.changedValue;
                            valueChanged = true;
                        }
                    }

                    if(isDefault && this._value !== this.defaultValue){
                        this.defaultValue = this._value;
                    }

                    if (valueChanged){
                        bindToParentBagIfNecessary(this.bag, this, validatedValue, oldValue);

                        if (this.bag._notifications === null) {
                            this.raiseChangedEvent(event);
                            this.bag.raisePropertyChanged([event]);
                        } else {
                            this.bag._notifications.push(event);
                        }
                    }
                }
                return this._value;
            },
            createdDefaultEvent:function(){
                return createEvent(this, null, this._value);
            },
            bindingPoint : function() {
                if (!this._bindingPoint){
                    this._bindingPoint = EventHandler(this, bindingPoint);
                }
                return this._bindingPoint;
            },
            bind:function() {
                var handler = this.getChangedEvent();
                handler.bind.apply(handler, arguments);

                return this;
            },
            setValue:function(){
                var handler = this.getChangedEvent();
                if(typeof handler.raise === 'function'){
                    handler.raise(this.createdDefaultEvent());
                } else {
                    handler(this.createdDefaultEvent());
                }
                return this;
            },
            unbind:function() {
                var handler = this.getChangedEvent();
                handler.unbind.apply(handler, arguments);

                return this;
            },
            editable:function(value) {
                if (value === undefined) {
                    value = true;
                }
                if (value){
                    this.isEditable = true;
                }
                else if(value === false){
                    this.isEditable = false;
                }
                else {
                    delete this.isEditable;
                }
                return this;
            },

            transparent:function(value) {
                if (value === undefined) {
                    value = true;
                }
                if (value){
                    this.isTransparent = true;
                }
                else {
                    delete this.isTransparent;
                }
                return this;
            },
            stateless:function(value) {
                if (value === undefined) {
                    value = true;
                }
                this.isStateless = value;
                return this;
            },
            changeDescription:function(value) {
                this.description = value;
                return this;
            },
            getValidators: function(){
                if (!this.validators){
                    this.validators = [];
                }
                return this.validators;
            },
            validate : function(callback) {
                this.getValidators().push(new CallbackValidator(callback));
                return this;
            },
            addValidator : function(validator) {
                this.getValidators().push(validator);
                return this;
            },
            validateNewValue : function(newValue, event) {
                event = event || createEvent(this, this._value, newValue);

                var errors;
                if (this.validators){
                    each(this.validators, function(v){
                        v.validate(event);
                        var e = v.getErrors();
                        for (var i in e){
                            if (!errors){
                                errors = {};
                            }
                            errors[i] = e[i];
                        }
                    });
                }
                else {
                    var validators = PropertyMetadata.getValidators(this.bag.metadataType(), this.propertyName);
                    if (validators){
                        for (var i = 0, l = validators.length; i < l; ++i){
                            var validator = validators[i];
                            validator.clear();
                            var err = validator.validate(event);
                            for (var e in err){
                                if (!errors){
                                    errors = {};
                                }
                                errors[e] = err[e];
                            }
                        }
                    }
                }

                return {
                    ok: event.ok,
                    errors: errors,
                    changedValue: event.changedValue
                };
            },
            editorTemplate : function(templateSelector, templateArgument) {
                this.useInModel();
                this.editable();
                this.editorTemplateSelector = templateSelector;
                this.editorTemplateArgument = templateArgument;
                return this;
            },
            editorTemplateArgument:function(value){
                this.editorTemplateArgument = value;
            },
            possibleValues : function(values, skipValidation) {
                if (arguments.length === 0) {
                    return this._possibleValues;
                }
                this._possibleValues = values;
                this._skipPossibleValuesValidation = skipValidation || false;
                return this;
            },
            getValueByLabel : function(label) {
                if (!this._possibleValues) {
                    return null;
                }

                for (var i in this._possibleValues) {
                    if (this._possibleValues[i] === label) {
                        return i;
                    }
                }

                return null;
            },
            useInModel : function(value) {
                value = (value == undefined)?true:value;
                this.isUsedInModel = value;
                return this;
            },
            cloneable : function(value) {
                this._isCloneable = value;
                return this;
            },
            isCloneable: function(){
                return this._isCloneable !== false;
            },
            getUniqueName : function(separator){
                separator = separator || ".";
                var result = "";
                var properties = [];

                var property = this;
                while (property){
                    properties.push(property);
                    property = property.bag.bagProperty;
                }

                eachReverse(properties, function(p){
                    if (result){
                        result += separator;
                    }
                    result += p.propertyName;
                });

                return result;
            },
            getOwner: function() {
                var property = this;
                var owner = null;
                while (property){
                    if(property && property.bag) {
                        owner = property.bag._owner;
                    }
                    property = property.bag.bagProperty;
                }

                return owner;
            },
            getUniqueDescription: function(){
                var result = "";
                var properties = [];

                var property = this;
                while (property){
                    properties.push(property);
                    property = property.bag.bagProperty;
                }

                eachReverse(properties, function(p){
                    if (result){
                        result += " -> ";
                    }
                    result += p.getDescription();
                });

                return result;
            },
            isDefault : function(){
                return this._value === this.defaultValue;
            },
            enable : function(){
                if (!this.isEnabled()){
                    this.raiseEnabledEvent(true);
                }
                this._isEnabled = true;
            },
            disable : function(){
                if (this.isEnabled()) {
                    this.raiseEnabledEvent(false);
                }
                this._isEnabled = false;
            },
            isEnabled : function(){
                return this._isEnabled !== false;
            },
            show: function(){
                if (!this.isVisible()){
                    this.raiseVisibilityChangedEvent(true);
                }
                this._isVisible = true;
                return this;
            },
            hide: function(){
                if (this.isVisible()){
                    this.raiseVisibilityChangedEvent(false);
                }
                this._isVisible = false;
                return this;
            },
            isVisible: function(){
                return this._isVisible !== false;
            },
            isComplex : function(){
                return this.defaultValue instanceof fwk.Properties || this._value instanceof fwk.Properties;
            },
            resetToDefault: function(){
                this.value(this.defaultValue);
            },
            setDefaultValue: function(value){
                this.defaultValue = value;
                return this;
            },
            ofType : function(type, argument){
                this.type = type.name;
                this.editorTemplate(type.editorTemplate, argument || type.argument);
                return this;
            },
            minMax: function(min, max){
                this.addValidator(new MinMaxValidator(min, max));
                return this;
            },
            getEnabledEvent: function(){
                if (!this.enabledEvent){
                    this.enabledEvent = fwk.EventHelper.createEvent();
                    var e = this.enabledEvent.enableStateTracking();  //REFACTOR_NOSERIALIZE
                    this.enabledEventStateTracker = e.bind(this, enabledEventStateChanged);
                }
                return this.enabledEvent;
            },
            getChangedEvent: function(){
                if (!this.changedEvent){
                    this.changedEvent = fwk.EventHelper.createEvent();
                }
                return this.changedEvent;
            },
            getVisibleChangedEvent: function(){
                if (!this.visibilityChangedEvent){
                    this.visibilityChangedEvent = fwk.EventHelper.createEvent();
                    var e = this.visibilityChangedEvent.enableStateTracking();
                    this.visibilityChangedEventStateTracker = e.bind(this, visibilityChangedEventStateChanged);//REFACTOR_NOSERIALIZE
                }
                return this.visibilityChangedEvent;
            },
            raiseChangedEvent: function(e){
                if (this.changedEvent){
                    this.changedEvent.raise(e);
                }
            },
            raiseEnabledEvent: function(e){
                if (this.enabledEvent){
                    this.enabledEvent.raise(e);
                }
            },
            raiseVisibilityChangedEvent: function(e){
                if (this.visibilityChangedEvent){
                    this.visibilityChangedEvent.raise(e);
                }
            },
            isReadOnly: function() {
                var result = false;
                var property = this;
                while (property && property.bag){
                    if (property.bag.readOnly()){
                        result = true;
                        break;
                    }
                    property = property.bag.bagProperty;
                }
                return result === true;
            },
            toJSON: function(includeDefaults, json, prefix){
                prefix = prefix ? prefix + "." : "";
                json = json || {};
                var value = this.value();
                if (value instanceof Array){
                    value = value.slice();
                }
                json[prefix + this.propertyName] = value;

            },
            getEditorTemplate: function(){
                return getEditorTemplate(this);
            },
            getEditorArgument: function(){
                if (this.hasOwnProperty("editorTemplateArgument")){
                    return this.editorTemplateArgument;
                }
                var metadata = getMetadata(this);
                if (!metadata){
                    return null;
                }
                if (metadata.hasOwnProperty("editorArgument")){
                    return metadata.editorArgument;
                }
                var type = metadata.type;
                if (type){
                    return PropertyTypes[type].argument;
                }
                return null;
            },
            //isEditable is already an existing field
            getIsEditable: function(){
                return propertyOfProperty(this, "isEditable", "editable")
            },
            getDescription: function(){
                return propertyOfProperty(this, "description", "displayName");
            },
            getPossibleValues: function(){
                return propertyOfProperty(this, "_possibleValues", "possibleValues");
            },
            getEditableType: function(){
                return propertyOfProperty(this, "type", "type");
            },
            dispose: function() {
                if (this.changedEvent){
                    this.changedEvent.clearSubscribers();
                }
                if (this.enabledEvent){
                    this.enabledEvent.clearSubscribers();
                }
                if (this.visibilityChangedEvent){
                    this.visibilityChangedEvent.clearSubscribers();
                }

                if (this.isComplex()){
                    var value = this.value();
                    if (value){
                        value.dispose();
                    }

                    if (this.defaultValue){
                        this.defaultValue.dispose();
                    }

                }
                else{
                    delete this._value;
                    delete this.defaultValue;
                }
            }
        }
    })());

    klass2("sketch.framework.Properties", null, (function() {
        return {
            _constructor: function(owner) {
                this.data = {};
                this._notifications = null;
                this._owner = owner;
            },
            createProperty:function createProperty() {
                var name, description, defaultValue;
                name = arguments[0];
                if (arguments.length === 3){
                    description = arguments[1];
                    defaultValue = arguments[2];
                }
                else if (arguments.length === 2){
                    defaultValue = arguments[1];
                }

                var actualName;
                if(name[0] !== '_'){
                    actualName = name;
                } else {
                    actualName = name.substr(1);
                }

                var property = new fwk.Property(this, actualName, description, defaultValue);

                this.data[actualName] = this[name] = property;

                return property;
            },
            get : function(name) {
                var prop = this.property(name);

                return prop.value.call(prop);
            },
            set : function(name, value, isDefault) {
                var prop = this.data[name];
                //TODO: think of deprecating properties
                if (prop){
                    prop.value.call(prop, value, isDefault);
                }
            },
            property:function(name){
                var prop = this.data[name];
                if(prop == undefined){
                    throw 'Property is not defined: ' + name;
                }
                return prop;
            },
            each: function(callback) {
                iterateProperties(this, callback, false);
            },
            bind : function(name, callback, setValue) {
                validateProperty.call(this, name);

                var prop = this.data[name];
                var subscription = prop.getChangedEvent().bind(callback);

                if (setValue === true){
                    callback(prop.createdDefaultEvent());
                }

                return subscription;
            },
            unbind : function(name, callback) {
                validateProperty.call(this, name);

                this.data[name].getChangedEvent().unbind(callback);
            },
            getPropertyChangedEvent: function(){
                if (!this.propertyChanged){
                    this.propertyChanged = fwk.EventHelper.createEvent();
                }
                return this.propertyChanged;
            },
            bindPropertyChanged: function(){
                var event = this.getPropertyChangedEvent();
                return event.bind.apply(event, arguments);
            },
            unbindPropertyChanged: function(){
                if (this.propertyChanged){
                    this.propertyChanged.unbind.apply(this.propertyChanged, arguments);
                }
            },
            raisePropertyChanged: function(e){
                if (this.propertyChanged){
                    this.propertyChanged.raise(e);
                }
            },
            lockNotifications:function() {
                this._notifications = [];
            },
            unlockNotifications:function() {
                var notifications = this._notifications;
                this._notifications = null;

                if (notifications && notifications.length > 0) {
                    var that = this;
                    each(notifications, function(e) {
                        var prop = that.data[e.property];
                        prop.raiseChangedEvent(e);
                    });
                    this.raisePropertyChanged(notifications);
                }
            },
            init:function(values, overrideDefault){
                this.lockNotifications();
                var childBags;

                for (var name in values){
                    if (name[0] === '$'){ //REFACTOR_NOSERIALIZE
                        this.bind(name.substr(1), values[name]);
                    } else if (name[0] === '*' || name[0] === '_' || name[0] === '#'){
                        // ignore it, we will handle it in the parent
                    } else{
                        var propertyName = name;
                        var extend = false;
                        if (propertyName[0] === "&"){
                            propertyName = propertyName.substr(1);
                            extend = true;
                        }

                        var dotIndex = propertyName.indexOf(".");
                        if (dotIndex !== -1){
                            var root = propertyName.substr(0, dotIndex);
                            if (!this.data.hasOwnProperty(root)){
                                //console.log("Ignoring property " + root);
                                continue;
                            }

                            var childProperty = propertyName.substr(dotIndex + 1, propertyName.length - dotIndex - 1);

                            if (!childBags){
                                childBags = {};
                            }
                            if (!childBags[root]){
                                childBags[root] = {};
                            }

                            childBags[root][childProperty] = values[name];
                        }
                        else {
                            if (!this.data.hasOwnProperty(propertyName)){
                                //console.log("Ignoring property " + propertyName);
                                continue;
                            }
                            var property = this.property(propertyName);
                            var params = values[name];
                            var value = params;
                            if (extend && property.isComplex()){
                                if (!property.value().canExtend()){
                                    throw "Property value cannot be extended: " + property.propertyName;
                                }
                                value = property.value().extend(params);
                            }
                            this.set(propertyName, value, overrideDefault);
                        }
                    }
                }

                if (childBags){
                    for (var root in childBags){
                        var type = childBags[root].__type__;
                        var props = childBags[root];
                        var childBag;
                        var isNew;

                        if (type){
                            childBag = fwk.UIElement.fromType(type, props);
                            if(!childBag.readOnly){
                                var defaultFunc = TypeDefaults[type];
                                var defaults = {};
                                if(defaultFunc){
                                    defaults = defaultFunc();
                                }
                                this.set(root, Object.assign(defaults, props), false);
                            }
                            else if (!childBag.readOnly()){
                                childBag.init(props, overrideDefault);
                            }
                            isNew = true;
                        }
                        else{
                            childBag = this.get(root);
                            if(!childBag) {
                                 this.set(root, props, false);
                            }
                            else if (childBag.readOnly()){
                                if (childBag.canExtend()){
                                    childBag = childBag.extend(props);
                                }
                                else {
                                    childBag = fwk.UIElement.fromType(childBag.__type__, props);
                                }
                                isNew = true;
                            }
                            else {
                                childBag.init(props, overrideDefault);
                            }
                        }

                        if (isNew){
                            this.set(root, childBag, overrideDefault);
                        }
                    }
                }

                this.unlockNotifications();
            },
            getEditableProperties: function() {
                var result = [];

                iterateProperties(this, function(p, complex){
                    if (p.getIsEditable()){
                        result.push(p);
                    }
                });

                return result;
            },
            getModelProperties: function(includeDefaults) {
                return this.toJSON(includeDefaults);
            },
            toJSON: function(includeDefaults, json, prefix){
                json = json || {};
                iterateProperties(this, function(property){
                    if (propertyOfProperty(property, "isUsedInModel", "useInModel") && (!property.isDefault() || includeDefaults)){
                        property.toJSON(includeDefaults, json, prefix);
                    }
                });
                if (this.Klass !== fwk.Properties){
                    json[prefix ? prefix + ".__type__" : "__type__"] = this.__type__;
                }
                return json;
            },
            addProperty: function(property) {
                this.data[property.propertyName] = this[property.propertyName] = property;
            },
            removeProperty: function(p) {
                return this.removePropertyByName(p.propertyName);
            },
            removePropertyByName: function(name){
                var prop = this.data[name];
                delete this.data[name];
                delete this[name];
                return prop;
            },
            count: function() {
                return this.data.length;
            },
            toArray: function() {
                var result = [];
                for (var i in this.data){
                    result.push(this.data[i]);
                }
                return result;
            },
            getPropertyByName: function(name){
                for (var i in this.data){
                    var prop = this.data[i];
                    if (prop.propertyName === name){
                        return prop;
                    }
                }
                return null;
            },
            exists: function(name){
                var property = this.getPropertyByName(name);
                return property !== null;
            },
            dispose: function(){
                if (this.readOnly()){
                    return;
                }
                iterateProperties(this, function(p){
                    p.dispose();
                });

                if (this.propertyChanged){
                    this.propertyChanged.clearSubscribers();
                }
                delete this._owner;
            },

            readOnly: function(value) {
                if (arguments.length === 1){
                    this._readOnly = value;
                }
                return this._readOnly;
            },

            extend:function(parameters){
                this.init(parameters);
                return this;
            },

            canExtend: function() {
                return false;
            },

            metadataType: function(type){
                if (arguments.length === 1){
                    this._metadataType = type;
                }
                return this._metadataType ? this._metadataType : "sketch.framework.UIElement";
            }
        }
    })());


    fwk.Properties.createEvent = createEvent;

    fwk.Properties.fromObject = function fromObject(obj){
        var props = new fwk.Properties();
        var isCompound = function(name){return name.indexOf('$') !== -1;}
        var isInModel = function(name){return name.indexOf('@') !== -1;}
        var getName = function(name){return name.replace(/[\$\@]*/, '')}

        for(var el in obj){
            var name = getName(el);
            var value;

            if(isCompound(el)){
                value = fwk.Properties.fromObject(obj[el]);
            } else {
                value = obj[el];
            }

            var prop = props.createProperty(name, '', value);

            if(isInModel(el)){
                prop.useInModel();
            }
        }

        return props;
    };

    return fwk.Properties;
});
