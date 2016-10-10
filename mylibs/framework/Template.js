define(["framework/Container", "framework/EventHelper", "framework/PropertyMetadata"], function(Container, EventHelper, PropertyMetadata){
    var fwk = sketch.framework;
    var Template = klass2('sketch.framework.Template', Container, (function(){
        var serializePropertyValue = function(property, value){
            var valueJSON;

            //if (property.isComplex()){
            //    //TODO: make complex types self-serializable
            //    var values = value.getModelProperties(true);
            //    valueJSON = {
            //        type: value.__type__,
            //        properties: values
            //    };
            //}
            //else{
                valueJSON = value;
            //}

            return valueJSON;
        };

        function registerCustomPropertiesMetadata(){
            var propertyMetadata = {};
            for (var i = 0, l = this._customProperties.length; i < l; ++i){
                var property = this._customProperties[i];
                propertyMetadata[property.name] = {
                    displayName: property.description,
                    type: property.type,
                    useInModel: true,
                    editable: true,
                    defaultValue:property.defaultValue
                };
            }
            var metadata = {};
            metadata[this.templateId()] = propertyMetadata;
            PropertyMetadata.extend("sketch.framework.TemplatedElement", metadata);
        }

        return {
            __version__: 2,
            _constructor: function(){
                this.updated = EventHelper.createEvent();

                this.setProps({
                    name: "__template__"
                }, true);

                this.hitVisible(false);
                this.canSelect(false);

                this._customProperties = [];
                this._defaultPropertyValues = [];
                this._propertyBindings = [];
                this._persistentFields = [];
                this._propertyCombinations = null;
            },
            templateId: function(value){
                if(value !== undefined) {
                    this.setProps({templateId:value});
                }
                return this.props.templateId;
            },
            setCombinations:function(combinations){
                this._propertyCombinations = combinations;
            },
            setTemplateId: function(newValue){
                this.templateId(newValue);
                registerCustomPropertiesMetadata.call(this);
            },
            system: function(value){
                if(value !== undefined) {
                    this.setProps({system:value});
                }
                return this.props.system;
            },
            templateName: function(value){
                if(value !== undefined) {
                    this.setProps({templateName:value});
                }
                return this.props.templateName;
            },
            addCustomProperty: function(property){
                this._customProperties.push({
                    name: property.propertyName,
                    type: property.type,
                    description: property.description,
                    defaultValue: serializePropertyValue(property, property.defaultValue)
                });
            },
            removeCustomProperty:function(propertyName){
                sketch.util.spliceStrict(this._customProperties, function(p){
                    return p.name === propertyName;
                });

                var bindings = this.getPropertyBindings();
                sketch.util.spliceStrict(bindings, function(b){
                    return b.sourcePropertyName === propertyName;
                });
            },
            addPropertyBinding: function(binding){
                this._propertyBindings.push(binding.toJSON());
            },
            getPropertyBindings: function(){
                return this._propertyBindings;
            },
            clearPropertyBindings: function(){
                this._propertyBindings = []
            },
            getCustomProperties: function(){
                return this._customProperties;
            },
            toJSON: function(includeDefaults){
                var result = Container.prototype.toJSON.apply(this, arguments);

                result.bindings = this._propertyBindings;
                result.customProperties = this._customProperties;
                result.defaultPropertyValues = this._defaultPropertyValues;
                result.persistentFields = this._persistentFields;
                result.propertyCombinations = this._propertyCombinations;

                return result;
            },
            fromJSON: function(json) {
                var that = this;

                this.clear();
                Container.prototype.fromJSON.apply(this, arguments);

                this._customProperties = json.customProperties;
                this._propertyBindings = json.bindings;
                this._defaultPropertyValues = json.defaultPropertyValues;
                if(json.propertyCombinations) {
                    this._propertyCombinations = json.propertyCombinations;
                }
                this._persistentFields = [];
                if (json.persistentFields){
                    this._persistentFields = json.persistentFields;
                }

                registerCustomPropertiesMetadata.call(this);

                return this;
            },
            updateDefaultPropertyValues: function(properties){
                var that = this;
                this._defaultPropertyValues = [];
                each(properties, function(p){
                    if (p.propertyName !== "x" && p.propertyName !== "top"){
                        that._defaultPropertyValues.push({name: p.getUniqueName(), value: serializePropertyValue(p, p.value()) });
                    }
                });
            },
            updatePersistentFields: function(fieldValues) {
                this._persistentFields = fieldValues;
            },
            persistentFields: function() {
                return this._persistentFields;
            },
            defaultPropertyValues: function(){
                return this._defaultPropertyValues;
            },
            updateFromContainer: function(container){
                var that = this;

                this.clear();
                for (var i = 0; i < container.children.length; i++){
                    var child = container.children[i];
                    this.add(child.clone());
                }

                registerCustomPropertiesMetadata.call(this);
                this.raiseUpdated();
            },
            updateFromTemplate: function(template){
                this.fromJSON(template.toJSON());

                this.raiseUpdated();
            },
            raiseUpdated: function(){
                this.updated.raise(this);
            },
            defaultWidth: function(){
                var p = sketch.util.singleOrDefault(this._defaultPropertyValues, function(d) { return d.name === "width"});
                return p ? p.value : 1;
            },
            defaultHeight: function(){
                var p = sketch.util.singleOrDefault(this._defaultPropertyValues, function(d) { return d.name === "height"});
                return p ? p.value : 1;
            },
            autoPosition: function(){
                var p = sketch.util.singleOrDefault(this._persistentFields, function(d) { return d.name === "autoPosition"});
                return p ? p.value : fwk.UIElement.FieldMetadata.autoPosition.defaultValue;
            },
            hasNonUniqueId: function(){
                var templateId = this.templateId();
                //old templates had counters as IDs so it was possible to have the same ID in two projects
                return typeof templateId === "number";
            }
        }
    }()));

    PropertyMetadata.extend("sketch.framework.UIElement", {
        "sketch.framework.Template": {
            templateId: {
                displayName: "Asset ID",
                type: "text",
                useInModel: true,
                editable: false
            },
            templateName: {
                displayName: "Asset name",
                type: "text",
                useInModel: true,
                editable: false
            },
            system: {
                displayName: "System asset",
                type: "trueFalse",
                useInModel: true,
                editable: false,
                defaultValue:false
            }
        }
    });

    return Template;
});