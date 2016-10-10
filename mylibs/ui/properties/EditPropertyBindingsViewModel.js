define(["viewmodels/DialogViewModel", "text!../../../../templates/dialogs.editPropertyBindings.jstmpl.html"], function(DialogViewModel, template){
    var fwk = sketch.framework;

    klass2("sketch.ui.properties.EditBindingsViewModel", DialogViewModel, (function(){
        var createElementsTree = function(element, data){
            var isRoot = data === undefined;
            if (isRoot){
                data = [];
            }
            var node = {
                data: element.name(),
                metadata: { "data-context": element },
                attr: { "id": "el_" + element.id() }
            };
            if (isRoot){
                node.state = "open";
            }
            data.push(node);

            if (element instanceof fwk.Container){
                var children = element.getChildren();
                if (children.length){
                    node.children = [];
                    for (var i = 0; i < children.length; i++){
                        var child = children[i];
                        createElementsTree(child, node.children);
                    }
                }
            }

            return data;
        };

        var createPropertiesTree = function(element){
            var data = [];

            var root = {
                data: element.name(),
                state: "open",
                metadata: { "data-context": element },
                attr: { "class": "not-selectable" },
                children: []
            };
            data.push(root);

            var bindings = this.bindings();
            var isBound = function(owner, property){
                var result = false;
                each(bindings, function(b){
                    if (b.targetElementName === owner.name() && b.targetPropertyName === property.getUniqueName()){
                        result = true;
                        return false;
                    }
                });
                return result;
            };

            var sourcePropertyType = this.sourceProperty.getEditableType();

            var addProperties = function(properties, data) {
                each(properties, function(p){

                    if(!fwk.TypeConvertors.isAssignableFrom(sourcePropertyType, p.getEditableType())){
                        return true;;
                    }

                    var node = {
                        data: p.getDescription(),
                        metadata: { "data-context": p },
                        attr: { "id": "prop_" + p.getUniqueName("_") }
                    };
                    if (isBound(element, p)){
                        node.attr["class"] = "jstree-checked";
                    }
                    data.push(node);

                    if (p.isComplex()){
                        node.children = [];
                        addProperties(p.defaultValue.toArray(), node.children);
                    }
                });
            };

            addProperties(element.getEditableProperties(false), root.children);

            return data;
        };

        var updateProperties = function(element){
            var that = this;
            this._selectedElement = element;

            var tree = {
                data: createPropertiesTree.call(this, element),
                options: {
                    plugins: ["checkbox"],
                    checkbox: {
                        two_state: true,
                        override_ui: true
                    }
                },
                onNodeChecked: function(property){
                    that.bindProperty(property);
                },
                onNodeUnchecked: function(property){
                    that.unbindProperty(property);
                },
                setApi: function(api){
                    that.propertiesTree = api;
                }
            };
            this.properties(tree);
        };

        var createMetaBinding = function(targetElement, targetProperty){
            return {
                targetElementName: targetElement.name(),
                targetPropertyDescription: targetProperty.getUniqueDescription(),
                targetPropertyName: targetProperty.getUniqueName(),
                sourceElementName: this.sourceElement.getTemplate().name(),
                sourcePropertyName: this.sourceProperty.getUniqueName()
            };
        };

        return {
            _constructor: function(sourceElement, sourceProperty, bindings){
                var that = this;
                this.sourceElement = sourceElement;
                this.sourceProperty = sourceProperty;
                this.sourcePropertyType = fwk.PropertyTypes[sourceProperty.getEditableType()].label;

                this.bindings = ko.observableArray([]);
                this.properties = ko.observableArray([]);

                var newBindings = [];
                each(bindings, function(b){
                    var targetElement = sourceElement.findElementByName(b.targetElementName);
                    var targetProperty = targetElement.properties.getPropertyByName(b.targetPropertyName);
                    newBindings.push(createMetaBinding.call(that, targetElement, targetProperty));
                });
                this.bindings(newBindings);

                this._selectedElement = null;
            },
            template: template,
            init: function(dialog, options){
                options.title = "Edit property bindings";
            },
            elementsTree: function(){
                var that = this;
                return {
                    data: createElementsTree(that.sourceElement),
                    onNodeSelected: function(element){
                        if (that._selectedElement !== element){
                            updateProperties.call(that, element);
                        }
                    }
                }
            },
            bindProperty: function(property){
                this.bindings.push(createMetaBinding.call(this, this._selectedElement, property));
            },
            unbindProperty: function(property){
                var targetElement = this._selectedElement;
                var toRemove;
                each(this.bindings(), function(b){
                    if (b.targetElementName === targetElement.name()
                        && b.targetPropertyName === property.getUniqueName()){
                        toRemove = b;
                        return false;
                    }
                });
                if (toRemove){
                    this.removeBinding(toRemove);
                }
            },
            removeBinding: function(binding){
                this.bindings.remove(binding);
                if (this._selectedElement && this._selectedElement.name() === binding.targetElementName){
                    this.propertiesTree.uncheckNode("prop_" + binding.targetPropertyName.replace(/\./ig, "_"));
                }
            }
        }
    })());
});