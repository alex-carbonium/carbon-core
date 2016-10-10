define(["framework/PropertyMetadata"], function(PropertyMetadata){
    var fwk = sketch.framework;
    fwk.TypeConvertors = {
        convertors: {
            'icon': {
                'trueFalse': function (value) {
                    if (!value) {
                        return false;
                    }

                    if (value && value.__type__==='sketch.framework.ImageSource' && !value.type) {
                        return false;
                    }

                    return true;
                },
                'image': function(value){
                    return value;
                }
            },
            'image': {
                'icon': function(value){
                    return value;
                }
            },
            'stroke': {
                'fill': function(value) {
                    return value;
                }
            },
            'fill': {
                'stroke': function(value) {
                    return value;
                }
            }
        },
        isAssignableFrom:function(from, to) {
            if(from === to) {
                return true;
            }
            var t = fwk.TypeConvertors.convertors[from];
            return t && t[to];
        },
        getConvertor:function(from, to) {

            var t = fwk.TypeConvertors.convertors[from];
            if(t) {
                return t[to];
            }

            return null;
        }

    }

    klass2("sketch.framework.PropertyBinding", null, {
        _constructor: function(){
            this.sourceElement = null;
            this.targetElement = null;
            this.sourcePropertyName = null;
            this.targetPropertyName = null;
        },

        init: function(sourceElement, sourcePropertyName, targetElement, targetPropertyName) {
            this.sourceElement = sourceElement;
            this.targetElement = targetElement;
            this.sourcePropertyName = sourcePropertyName;
            this.targetPropertyName = targetPropertyName;
            return this;
        },
        initFromObject: function(obj) {
            this.sourceElement = obj.sourceElement;
            this.targetElement = obj.targetElement;
            this.sourcePropertyName = obj.sourcePropertyName;
            this.targetPropertyName = obj.targetPropertyName;
            return this;
        },
        toJSON: function(){
            return {
                sourceElementName: this.sourceElement.name(),
                targetElementName: this.targetElement.name(),
                sourcePropertyName: this.sourcePropertyName,
                targetPropertyName: this.targetPropertyName
            }
        },

        update: function() {
            if(!this.sourceType) {
                var sourceTypeMetadata = PropertyMetadata.findAll(this.sourceElement.systemType());
                this.sourceType = sourceTypeMetadata[this.sourcePropertyName].type;
            }
            if(!this.targetType) {
                var targetTypeMetadata = PropertyMetadata.findAll(this.targetElement.systemType());
                this.targetType = targetTypeMetadata[this.targetPropertyName].type;
            }
            var sourceType = this.sourceType;
            var targetType = this.targetType;

            var sourceValue = this.sourceElement.props[this.sourcePropertyName];

            var props = {};
            if(sourceType === targetType) {
                props[this.targetPropertyName] = sourceValue;
                this.targetElement.setProps(props);
                //this._binding = this.sourcePropertyName.getChangedEvent().bind(this.targetPropertyName.bindingPoint());
            } else {
                var convertor = fwk.TypeConvertors.getConvertor(sourceType, targetType);
                if(!convertor) {
                    throw new Error('Incorrect binding: ' + this.toString());
                }
                props[this.targetPropertyName] = convertor(sourceValue);
                this.targetElement.setProps(props);

                //var that = this;
                //this._binding = this.sourcePropertyName.getChangedEvent().bind(function(e){
                //    that.targetPropertyName.bindingPoint().raise({newValue:convertor(e.newValue)});
                //});
            }
        },
        toString: function() {
            return JSON.stringify(this.toJSON());
        }
    });

    fwk.PropertyBinding.fromJSON = function(json, container){
        var binding = new fwk.PropertyBinding();
        var sourceElement = container.findElementByName(json.sourceElementName);
        var targetElement = container.findElementByName(json.targetElementName);

        var sourcePropertyName = json.sourcePropertyName;
        var targetPropertyName = json.targetPropertyName;

        binding.init(sourceElement, sourcePropertyName, targetElement, targetPropertyName);

        return binding;
    };

    return fwk.PropertyBinding;
});
