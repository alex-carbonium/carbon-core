define(["server/DeveloperProxy"], function(DeveloperProxy){
    var fwk = sketch.framework;
    var ui = sketch.ui;
    var cmd = sketch.commands;
    var wnd = sketch.windows;

    klass2("sketch.framework.ObservableState", null, (function(){
        function stateMenuOptions(state){
            var that = this;
            return {
                alias: "property_menu_" + state.name(),
                items: [
                    {
                        text: "Duplicate",
                        alias: "state_action_duplicate__" + state.name(),
                        action: function(){
                            state._designer.duplicateState(state);
                        }
                    },
                    {
                        text: "Rename",
                        alias: "state_action_rename__" + state.name(),
                        action: function(){
                            state._designer.renameState(state);
                        }
                    },
                    {
                        text: "Delete",  // TODO: disable if it is default
                        alias: "state_action_delete__" + state.name(),
                        action: function(){
                            state._designer.deleteState(state);
                        }
                    }
                ]
            }
        }

        return {
            _constructor:function(stateName, designer){
                this._designer  = designer;
                this.name = ko.observable(stateName);
                this.selected = ko.observable(false);
                this.expanded = ko.observable(false);
                this.menuOptions = stateMenuOptions(this);
                this.controls = ko.observableArray([]);
                var state = this._state = designer.element._recorder.states[stateName];
                state.stateChanged.bind(this, this.updateStateContent);
                this.updateStateContent();
            },
            dispose:function(){
                this._state.stateChanged.unbind(this, this.updateStateContent);
            },
            toggle:function(){
                this.expanded(!this.expanded());
            },
            updateStateContent:function(){
                var that = this;
                var element = this._designer.element;
                var state = element._recorder.states[this.name()];
                var currentName = null;
                that.controls([]);
                var current = null;

                state.each(function(el, prop, val){
                    if(currentName !== el){
                        currentName = el;
                        current = {
                            name:el,
                            properties:ko.observableArray([])
                        };
                        that.controls.push(current);
                    }
                    current.properties.push({
                        name:prop,
                        value:val
                    });
                });
            }

        }
    })());

    return klass2('sketch.ui.TemplatePropertyDesigner', null, (function(){
        var propertyCounter = 1;

        var showEditPropertyDialog = function(property){
            var model = new ui.EditPropertyViewModel(this.element, property);
            model.bindOnSaved(EventHandler(this, propertySaved).closure());

            new wnd.Dialog(model, {modal: true, width: "auto"}).showDialog();
        };

        var findPropertyBindings = function(property){
            var bindings = this.element.getPropertyBindings();
            return sketch.util.where(bindings, function(b){
                return b.sourcePropertyName === property.getUniqueName();
            });
        };
        var showEditBindingsDialog = function(property){
            var bindings = findPropertyBindings.call(this, property);

            var model = new ui.properties.EditBindingsViewModel(this.element, property, bindings);
            model.bindOnSaved(EventHandler(this, bindingsSaved).closure());

            var dialog = new wnd.Dialog(model, {modal: true, width: "auto"});
            dialog.showDialog();
            return dialog;
        };

        function deleteCustomProperty(property){
            this.element.removeCustomProperty(property);
            var index = sketch.util.indexOf(this.properties(), function(p){
                return p.property == property;
            });
            if(index >= 0){
                this.properties.splice(index, 1);
            }
        }

        var propertyMenuOptions = function(property){
            var that = this;
            return {
                alias: "property_menu_" + property.getUniqueName("_"),
                items: [
                    {
                        text: "Edit",
                        alias: "property_action_edit_" + property.getUniqueName("_"),
                        action: function(){
                            showEditPropertyDialog.call(that, property);
                        }
                    },
                    {
                        text: "Bindings",
                        alias: "property_action_bindings_" + property.getUniqueName("_"),
                        action: function(){
                            showEditBindingsDialog.call(that, property);
                        }
                    },
                    {
                        text: "Delete",
                        alias: "property_action_delete_" + property.getUniqueName("_"),
                        action: function(){
                            deleteCustomProperty.call(that, property);
                        }
                    }
                ]
            }
        };


        var createMetaProperty = function(property){
            var visualProperty = registrar.createVisualProperty(property);
            this._activeEditors.push(visualProperty.editor);
            visualProperty.menuOptions = propertyMenuOptions.call(this, property);
            return visualProperty;
        };

        var createMetaField = function(element, field){
            var visualField = registrar.createVisualField(element, field);
            if (visualField){
                this._activeEditors.push(visualField.editor);
            }
            return visualField;
        };

        function createObservableState(state){
            return new fwk.ObservableState(state, this);
        }

        function getPossibleChildrenBehaviors(){
            var res = [];
            var behaviorNamespace = sketch.ui.childrenBehavior;
            for (var type in behaviorNamespace){
                if (behaviorNamespace.hasOwnProperty(type)){
                    var behavior = behaviorNamespace[type];
                    res.push({type: "sketch.ui.childrenBehavior." + type, displayName: behavior.prototype.displayName.call()});
                }
            }
            return res;
        }

        var propertySaved = function(model){
            var property = model.property;
            if (!this.element.properties.getPropertyByName(property.propertyName)){
                var p = this.element.addCustomProperty(property.propertyName, property.type, property.description, property.defaultValue);
                this.properties.push(createMetaProperty.call(this, property));
            }
        };
        var bindingsSaved = function(bindingsModel){
            this.element.updateBindings(bindingsModel.bindings());
        };

        function updateChildrenBehaviors(){
            var behaviors = this.element.getAssignedChildrenBehaviors();
            var childrenBehaviors = [];
            if (behaviors){
                for (var i = 0, l = behaviors.length; i < l; ++i){
                    var behavior = behaviors[i];
                    childrenBehaviors.push({
                        behavior: behavior,
                        displayName: behavior.displayName(),
                        canEdit: ko.observable(behavior.editDialog())
                    });
                }
            }
            this.childrenBehaviors(childrenBehaviors);
        }
        function addChildrenBehavior(type){
            if (!type){
                return;
            }
            var Klass = sketch.getKlass(type);
            var behavior = new Klass();
            this.element.addChildrenBehavior(behavior);
            updateChildrenBehaviors.call(this);

            var added = this.childrenBehaviors()[this.childrenBehaviors().length - 1];
            if (added.canEdit()){
                this.editChildrenBehavior(added);
            }
        }
        function persistChildrenBehaviors(){
            var behaviors = map(this.childrenBehaviors(), function(x) {return x.behavior;});
            this.element.persistChildrenBehaviors(behaviors);
        }

        var attach = function(element){
            ko.cleanNode(this.$root[0]);
            var that = this;

            if ((element instanceof fwk.TemplatedElement) && element.mode() === "edit") {
                var customProperties = element.getCustomProperties();
                this.element = element;
                this.elementName(element.getTemplate().templateName());
                this.elementId(element.templateId());
                this.mainContainerType(element.mainContainerType());
                var s = this.mainContainerType.subscribe(function(newValue){
                    that.element.mainContainerType(newValue);
                });
                this._subscriptions.push(s);

                s = this.newChildrenBehavior.subscribe(EventHandler(this, addChildrenBehavior).closure());
                this._subscriptions.push(s);

                var metaProperties = [];
                each(customProperties, function(p){
                    metaProperties.push(createMetaProperty.call(that, p));
                });
                this.properties(metaProperties);

                if (DEBUG){
                    var metaFields = [];
                    each(fwk.TemplatedElement.PersistentFields, function(f){
                        var visualField = createMetaField.call(that, element, f);
                        if (visualField){
                            metaFields.push(visualField);
                        }
                    });
                    this.fields(metaFields);
                }

                var states = [];
                for(var state in element.states()){
                    states.push(createObservableState.call(this, state));
                }

                this.selectedState = states[0];
                states[0].selected(true);
                this.states(states);

                updateChildrenBehaviors.call(this);
                this.isDebug = DEBUG;

                ko.applyBindingsWithValidation(this, this.$root[0]);
            }
        };

        var init = function(){
            var that = this;
            var app = that._app;
        };

        var detach = function(){
            each(this._subscriptions, function(s){
                s.dispose();
            });
            each(this._activeEditors, function(e){
                e.dispose();
            });

            each(this.states(), function(s){
                s.dispose();
            });
            this._subscriptions = [];
            this._activeEditors = [];

            ko.cleanNode(this.$root[0]);
            this.$root.empty();
        };

        var save = function(){
            var template = this.element.getTemplate();
            template.templateName(this.elementName());
            if (template.templateId() !== this.elementId()){
                fwk.Resources.updateTemplateId(template.templateId(), this.elementId());
                this.element.setProps({templateId:this.elementId()});
            }
        };

        return {
            _constructor: function(domSelector, app){
                this.$root = $(domSelector);
                this._app = app;
                this._activeEditors = [];
                this._subscriptions = [];

                this.properties = ko.observableArray([]);
                this.fields = ko.observableArray([]);
                this.states = ko.observableArray([]);
                this.childrenBehaviors = ko.observableArray([]);
                this.elementName = ko.observable("").extend({ required: true });
                this.elementId = ko.observable("").extend({ required: true });
                this.mainContainerType = ko.observable("");
                this.mainContainerTypes = [];
                for (var i in fwk.TemplatedElement.MainContainerTypes){
                    this.mainContainerTypes.push({id: i, caption: fwk.TemplatedElement.MainContainerTypes[i]});
                }
                this.newChildrenBehavior = ko.observable(null);

                init.call(this);
            },
            createProperty: function(){
                var property = new fwk.Properties().createProperty("new" + propertyCounter, "New " + propertyCounter, "")
                    .ofType(fwk.PropertyTypes.text);
                ++propertyCounter;

                showEditPropertyDialog.call(this, property);
            },
            removeProperty: function(property) {
                this.properties.remove(property);
            },
            getNextStateName:function(){
                var lastState = this.states()[this.states().length-1];
                var name = lastState.name();
                var number = +/\d+/.exec(name);
                return 'state'+(++number);
            },
            createState:function(){
                var newName = this.getNextStateName();
                this.element.addState(newName);
                var state = createObservableState.call(this, newName);
                this.states.push(state);
                this.changeState(state);
            },
            duplicateState:function(state){
                var newName = this.getNextStateName();
                this.element.duplicateState(state.name(), newName);
                var state = createObservableState.call(this, newName);
                this.states.push(state);
                this.changeState(state);
            },
            manageStates:function(){
                var model = new ui.EditStatesDialogViewModel(this.element, this.states());
                var dialog = new wnd.Dialog(model, {modal: true, width: "auto"});
                dialog.showDialog();
            },
            renameState:function(state){
                var value;
                if(value = prompt("Rename state", state.name())) {
                    this.element.renameState(state.name(), value);
                    state.name(value);
                }
            },
            deleteState:function(data){
                if(this.selectedState === data){
                    var baseState = this.states()[0];
                }
                this.states.remove(data);
                if(baseState){
                    this.changeState(baseState);
                }
                this.element.removeState(data.name());
            },
            changeState:function(data){
                this.selectedState.selected(false);
                this.selectedState = data;
                data.selected(true);
                this.element.state(data.name());
            },
            possibleChildrenBehaviors: function() {
                return getPossibleChildrenBehaviors();
            },
            showEditBindingsDialog: function(property){
                return showEditBindingsDialog.call(this, property);
            },
            removeChildrenBehavior: function(data) {
                this.element.removeChildrenBehavior(data.behavior);
                updateChildrenBehaviors.call(this);
            },
            editChildrenBehavior: function(data) {
                var dialog = new sketch.windows.Dialog(data.behavior.editDialog(), {modal: true});
                dialog.viewModelPromise().then(function(viewModel){
                    viewModel.setBehavior(data.behavior);
                    viewModel.bindOnSaved(persistChildrenBehaviors.bind(this));
                }.bind(this));
                dialog.showDialog();
            },
            attach: function(element){
                attach.call(this, element);
            },
            detach: function(saveChanges){
                if (saveChanges){
                    save.call(this);
                }
                detach.call(this);
            },
            isValid: function(){
                return ko.validatedObservable(this).isValid();
            },
            saveTemplate: function(){
                this.element.state('default');
                this.element._recorder.stop();
                this.element.states(this.element._recorder.getStatesJSON());
                this.element._recorder.record();
                save.call(this);
                var template = fwk.Resources.getTemplate(this.element.templateId());

                template.system(true);
                this.element.updateTemplate();
                var templateData = JSON.stringify(template.toJSON(), null, '\t');

                var proxy = new DeveloperProxy();
                proxy.saveControlTemplate(this.element.templateId(), templateData);
            }
        };
    })());
});