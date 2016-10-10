define(["viewmodels/DialogViewModel", "text!../../../../templates/editPropertyDialog.jstmpl.html"], function(DialogViewModel, template){
    var fwk = sketch.framework;
    var ui = sketch.ui;

    return klass2("sketch.ui.EditPropertyViewModel", DialogViewModel, (function(){
        var configurablePropertyTypes = [];
        var registerPropertyType = function(type){
            //configurablePropertyTypes.push({
            //    id: type,
            //    label: fwk.PropertyTypes[type].label
            //})
        };

        registerPropertyType("text");
        //registerPropertyType("numeric");
        registerPropertyType("image");
        registerPropertyType("icon");
        registerPropertyType("fill");
        registerPropertyType("trueFalse");
        registerPropertyType("font");

        var createVisualProperty = function(property){
            var visualProperty = ui.editors.Registrar.createVisualProperty(property);
            visualProperty.editor.description("");
            return visualProperty;
        };

        var createPropertyName = function(str){
            var result = [];
            var alphaNumeric = /([a-z]|[0-9])/i;
            for (var i = 0; i < str.length; ++i){
                var c = str.charAt(i);
                if (alphaNumeric.test(c)){
                    result.push(c);
                }
                else {
                    result.push("_");
                }
            }
            return result.join("");
        };
        var validatePropertyName = function(value, api){
            var result = true;
            var propertyName = createPropertyName(value);
            if (this.element.properties.exists(propertyName)){
                api.error("Property with this name already exists");
                result = false;
            }
            return result;
        };

        return {
            template: template,
            _constructor: function(element, property){
                var that = this;
                this.element = element;
                this.property = property;
                this.propertyTypes = configurablePropertyTypes;
                this.propertyDescription = ko.observable(property.description);
                this._originalName = property.propertyName;
                this.propertyName = ko.observable(property.propertyName)
                    .extend({ required: true })
                    .extend({ callback: EventHandler(this, validatePropertyName).closure() });
                this.propertyType = ko.observable(fwk.PropertyTypes.findNameByTemplate(property.editorTemplateSelector || property.getEditorTemplate()));
                this.visualProperty = ko.observable(createVisualProperty(property));

                this.addSubscription(this.propertyType.subscribe(EventHandler(this, this.propertyTypeChanged).closure()));
            },
            init: function(dialog, options){
                options.title = "Edit property";
            },
            propertyTemplateId: function() {
                var type = this.propertyType();
                return fwk.PropertyTypes[type].editorTemplate;
            },
            propertyTypeChanged: function(newValue) {
                this.visualProperty().editor.dispose();

                var type = fwk.PropertyTypes[newValue];
                this.property.ofType(type);
                this.property.value(type.defaultValue);

                this.visualProperty(createVisualProperty(this.property));
            },
            dispose: function() {
                this.visualProperty().editor.dispose();
            },
            onSaved: function() {
                if(this.propertyName() !== this._originalName){
                    this.property = this.property.bag.createProperty(this.propertyName(), this.propertyDescription(), this.property.value())
                        .ofType(fwk.PropertyTypes[this.propertyType()]);
                } else {
                    this.property.propertyName = this.propertyName();
                    this.property.description = this.propertyDescription();
                    this.property.ofType(fwk.PropertyTypes[this.propertyType()]);
                    this.property.defaultValue = this.property.value();
                }
            }
        }
    })());
});