import Container from "framework/Container";
import PropertyBinding from "framework/PropertyBinding";
import CompositeBehavior from "framework/CompositeBehavior";
import TemplateStateRecorder from "framework/TemplateStateRecorder";
import {ArrangeStrategies, StackOrientation} from "framework/Defs";
import PropertyMetadata from "framework/PropertyMetadata";

var fwk = sketch.framework;

function getPossibleBehaviors() {
    var res = {"": "None"};
    var behaviorNamespace = sketch.ui.behavior;
    for (var type in behaviorNamespace) {
        if (behaviorNamespace.hasOwnProperty(type)) {
            var behavior = behaviorNamespace[type];
            res[type] = behavior.prototype.displayName.call();
        }
    }

    return res;
}

function applyStateOverrittenProperties(stateName) {
    if (!this.states) {
        return;
    }
    this.__state = 1;
    var state = this.states[stateName];

    if (state) {
        this.setProps(state.properties);
    }
    delete this.__state;
}

var Klass = klass2('sketch.framework.TemplatedElement', Container, (function () {
    function onStateChanged(state) {
        this.__state = 1;
        this._recorder.changeState(state);
        applyStateOverrittenProperties.call(this, state);

        delete this.__state;

        if (this.stateChanged) {
            this.stateChanged.raise(state);
        }
    }

    function updatePromotedContainer() {
        delete this._promotedContainer;

        var controlName = this.promotedContainerName();
        if (!controlName || this._mode === 'edit') {
            return;
        }

        var control;
        if (controlName === "Root") {
            control = this;
        }
        else {
            control = this.findElementByName(controlName);
        }
        if (!control) {
            return;
        }

        this._promotedContainer = control;
        if (isPromotedContainerNotSelf.call(this)) {
            this._promotedContainer.hitVisible(true);
            this._promotedContainer.canSelect(false);
            this._promotedContainer.canDrag(false);
            this._promotedContainer.enableGroupLocking(false);
        }

        this.enableGroupLocking(true);
    }

    function hasPromotedContainer() {
        return this._promotedContainer;
    }

    function isPromotedContainerNotSelf() {
        return this._promotedContainer && this._promotedContainer !== this;
    }

    function getActualChildrenContainer() {
        return hasPromotedContainer.call(this) ? this._promotedContainer : this;
    }

    var enableNameProperty = function (element, value) {
        // TODO: fix
        //element.applyVisitor(function (e) {
        //    e.properties.name.editable(value);
        //});
    };

    function clearElementBindings(element) {
        var toRemove = [];
        var that = this;

        each(this._activeBindings, function (b) {
            if (b.targetElement === element) {
                that._inactiveBindings.push(b);
                toRemove.push(b);
            }
        });

        sketch.util.removeGroupFromArray(this._activeBindings, toRemove);
    }

    function restoreElementBindings(element) {
        var toRemove = [];
        var that = this;

        each(this._inactiveBindings, function (b) {
            if (b.targetElement === element) {
                that._activeBindings.push(b);
                toRemove.push(b);
            }
        });

        sketch.util.removeGroupFromArray(this._inactiveBindings, toRemove);
    }

    function onChildElementChanged(e) {
        if (e.action === "added") {
            enableNameProperty.call(this, e.element, true);
            bindChildElementAdded.call(this, e.element);
            restoreElementBindings.call(this, e.element);
        } else if (e.action === "removed") {
            enableNameProperty.call(this, e.element, false);
            unbindChildElementAdded.call(this, e.element);
            clearElementBindings.call(this, e.element);
        } else if (e.action === "clearing") {
            enableNameProperty.call(this, this, false);
            unbindChildElementAdded.call(this, this);
        }
    }

    function bindChildElementAdded(element) {
        var that = this;
        element.applyVisitor(function (e) {
            if (e.children) {
                e.children.changed.bind(that, onChildElementChanged);
            }
        });
    }

    function unbindChildElementAdded(element) {
        var that = this;
        element.applyVisitor(function (e) {
            if (e.children) {
                e.children.changed.unbind(that, onChildElementChanged);
            }
        });
    }

    function edit() {
        this._mode = "edit";
        this.canSelect(false);
        this.canDrag(false);
        this._states = null;
        //if (DEBUG) {
        //    this.properties.promotedContainerName.editable(true);
        //    this.properties.mainContainerType.editable(true);
        //    this.properties.behavior.editable(true);
        //    this.properties.toolboxTileType.editable(true);
        //}
        //this.properties.scaleContent.editable(true);
        this.enableGroupLocking(false);

        initFromTemplate.call(this, this.getTemplate());
        this.state('default');

        this._recorder.record();
        enableNameProperty.call(this, this, DEBUG);
        bindChildElementAdded.call(this, this);
    };

    function completeEditing(updateTemplate) {
        this.canSelect(true);
        this.canDrag(true);
        this._mode = "draw";

        this.state('default');
        this._recorder.stop();
        this.states(this._recorder.getStatesJSON());

        if (updateTemplate) {
            this.updateTemplate();
        }
        else {
            initFromTemplate.call(this, this.getTemplate());
        }

        //this.properties.promotedContainerName.editable(false);
        //this.properties.toolboxTileType.editable(false);
        //this.properties.behavior.editable(false);
        enableNameProperty.call(this, this, false);
        //this.properties.scaleContent.editable(false);
        unbindChildElementAdded.call(this, this);
    };

    var initFromTemplate = function (template) {
        var that = this;
        var id = this.id();
        this.props = PropertyMetadata.getDefaultProps(template.templateId());

        this.props = Object.assign(this.props, {templateId:template.templateId(), id:id});
        if (this._childrenBehavior) {
            this._childrenBehavior.dispose();
            delete this._childrenBehavior;
        }

        this.updatingTemplate();
        disposeAllObjects.call(this);
        var children = [];
        if (hasPromotedContainer.call(this)) {
            this._promotedContainer.getChildren().each(function (_, e) {
                children.push(e);
            });
        }

        this.arrangeStrategy(template.arrangeStrategy());
        updateDropPositioning.call(this);

        Container.prototype.clear.call(this);
        delete this._promotedContainer;

        var modifiedValues = getModifiedPropertyValues.call(this);
        //needed for canvas resize
        this.resize({
            x: this.x(),
            y: this.y(),
            width: template.defaultWidth(),
            height: template.defaultHeight()
        });

        template.getChildren().each(function (i, child) {
            var clone = child.clone();
           
            that.add(clone);
        });

        //updateCustomProperties.call(this, template);
        updateDefaultPropertyValues.call(this, template);
        updateBindings.call(this, template, template.getPropertyBindings());
        updateModifiedPropertyValues.call(this, modifiedValues);
        updatePersistentFields.call(this, template);

        this._recorder.initFromJSON(this.states());
        updatePromotedContainer.call(this);
        this.isAtomicInModel(!hasPromotedContainer.call(this));

        if (hasPromotedContainer.call(this)) {
            each(children, function (e) {
                that._promotedContainer.add(e);
            });
        }
        this.setCombinations(template._propertyCombinations);

        this.updatedTemplate();

        var childrenBehaviors = this.getAssignedChildrenBehaviors();

        if (childrenBehaviors && this._mode !== "edit") {
            this.setChildrenBehaviors(childrenBehaviors);
        }

        if (hasPromotedContainer.call(this)) {
            //TODO:fix
            this._angleEditable = false;
        }

        markStatePropertiesAsNotPersistent.call(this);
        ensureElementName(this);

        this.performArrange();
    };

    //State properties for Root are persisted in state data so they should not be in standard properties json
    function markStatePropertiesAsNotPersistent() {
        // TODO: fix
        //var states = this.states();
        //for (var stateName in states) {
        //    var state = states[stateName];
        //    var rootConfig = state.Root;
        //    if (rootConfig) {
        //        for (var propertyName in rootConfig) {
        //            var property = this.properties[propertyName];
        //            if (property) {
        //                property.useInModel(false);
        //            }
        //        }
        //    }
        //}
    }

    function getModifiedPropertyValues() {
        var result = {};
        var props = this.props;
        var defaultProps = PropertyMetadata.getDefaultProps(this.systemType());

        each(this.getEditableProperties(), function (p) {
            var value = props[p];
            if (value !== defaultProps[p]) {
                result[p] = value;
            }
        });

        return result;
    }

    function updateModifiedPropertyValues(values) {
        for (var propertyName in values) {
            var property = this.properties.getPropertyByName(propertyName);
            if (property) {
                property.value(values[propertyName]);
            }
        }
    }

    //var updateCustomProperties = function (template) {
        //var that = this;
        //
        //this._customProperties = [];
        //
        //each(template.getCustomProperties(), function (p) {
        //    var defaultValue = deserializePropertyValue(p.defaultValue);
        //
        //    if (p.editorArgument) {
        //        property.editorTemplateArgument(p.editorArgument);
        //    }
        //    that._customProperties.push(property);
        //});
    //};

    var updateDefaultPropertyValues = function (template) {
        var properties = template.defaultPropertyValues();
        var props = {};
        each(properties, function(p){
            var property = properties[p.name];
            var newValue = deserializePropertyValue(p.value);
            props[p.name] = newValue;
        });
        this.setProps(props);
    };

    function disposeAllObjects() {
        each(this._disposableObjects, function (e) {
            e.dispose();
        });

        this._disposableObjects = [];
    }

    var updatePersistentFields = function (template) {
        var fieldValues = template.persistentFields();
        var that = this;
        each(fieldValues, function (f) {
            that[f.name](f.value);
        });
    };

    function updateFromCombination() {
        var values = [];
        var props = this._propertyCombinations.properties;
        var combinationValues = this._propertyCombinations.values;
        var bag = this.props;

        for (var i = 0; i < props.length; ++i) {
            var propName = props[i];
            if (propName[0] === '$') {
                var element = this;
                var value = false;
                if (element) {
                    var parent = element.parent();
                    if (parent) {
                        if (propName === '$firstChild') {
                            value = parent.positionOf(element) === 0;
                        } else if (propName === '$lastChild') {
                            value = parent.positionOf(element) === (parent.count() - 1);
                        }
                    }
                }

                values.push(value);
            } else {
                values.push(bag[propName]);
            }
        }
        for (var state in combinationValues) {
            var stateValues = combinationValues[state];
            var valid = true;
            for (var j = 0; j < values.length; ++j) {
                if (stateValues[j] !== undefined && stateValues[j] != values[j]) {
                    valid = false;
                    break;
                }
            }
            if (valid && this.state() !== state) {
                this.setProps({state: state});
                return;
            }
        }
    }

    var updateBindings = function (template, newBindings, persist) {
        //TODO: what to do with different names for template and templated element
        var oldName = this.name();
        this.name(template.name());

        var that = this;
        this._activeBindings = [];
        this._inactiveBindings = [];

        if (persist) {
            // TODO: fix it, its a bug that when edit one property binding all other are cleared
            // template.clearPropertyBindings();
        }

        each(newBindings, function (b) {
            var binding = PropertyBinding.fromJSON(b, that);
            binding.update();
            that._activeBindings.push(binding);

            if (persist) {
                template.addPropertyBinding(binding);
            }
        });

        this.name(oldName);
        updatePromotedContainer.call(this);
    };

    var deserializePropertyValue = function (value) {
        if (value === null) {
            return null;
        }

        var result;
        var isComplex = typeof value === "object";
        if (isComplex && value.type) {
            result = fwk.UIElement.fromType(value.type, value.properties);
        }
        else {
            result = value;
        }

        return result;
    };

    var ensureElementName = function (element) {
        if (!element.name()) {
            element.name(element.displayName() + " [" + element.id() + "]");
        }
    };

    var onTemplateIdChanged = function (templateId) {

        var template = fwk.Resources.getTemplate(templateId);
        // a temporary fix for the production project 3796 which has references to non-existing assets
        if (!template) {
            return;
        }

        this._originalWidth = template.defaultWidth();
        this._originalHeight = template.defaultHeight();

        initFromTemplate.call(this, template);

        if (this._templateSubscription) {
            this._templateSubscription.dispose();
        }
        var that = this;
        this._templateSubscription = template.updated.bind(function () {
            if (template.templateId() !== that.templateId()) {
                that.setProps({templateId: template.templateId()});
            }
            else {
                initFromTemplate.call(that, that.getTemplate());
            }
        });
    };

    function updateDropPositioning() {
        if (this.arrangeStrategy() === ArrangeStrategies.Stack){
            if (this.props.stackOrientation === StackOrientation.Horizontal){
                this.dropPositioning("horizontal");
            }
            else{
                this.dropPositioning("vertical");
            }
        }
    }

    function containsSameTemplate(element) {
        var templateId = this.templateId();
        var result = false;
        element.applyVisitor(function (e) {
            if (e instanceof fwk.TemplatedElement) {
                result = templateId === e.templateId();
                if (result) {
                    return false;
                }
            }
        }, false);
        return result;
    }


    function registerPropertyStateOverride(props) {
        if (this.__state === 1 || this._mode === "edit") {
            return;
        }
        var currentState = this._recorder.getState('default');
        var that = this;
        that._states = that._states || {};
        var stateName = this.state();
        var state = that._states[stateName] = that._states[stateName] || {};
        var properties = state["properties"] = state["properties"] || {};

        var override = false;


        // TODO: fix
        //each(events, function(event){
        //    if(event.context && currentState.hasValue('Root', event.property)){
        //        if(!event.prop.isDefault()) {
        //            event.prop.toJSON(true, properties);
        //            override = true;
        //        }
        //    }
        //});

        if (override && App.Current.commandExecuting) {
            App.Current.raiseLogEvent(fwk.sync.Primitive.element_state_override(this, stateName, props));
        }
    }

    function updateBehavior() {

        if (this._currentBehavior) {
            this._currentBehavior.detach();
            delete this._currentBehavior;
        }
        var name = this.behavior();
        if (name && this._mode !== 'edit') {
            var behaviorType = sketch.ui.behavior[name];
            var behavior = new behaviorType();

            var res = behavior.validate(this);
            if (res.length > 0) {
                notify("error", {title: "Invalid template", text: res.join('\r\n')});
                return;
            }

            this._currentBehavior = behavior;
            this._currentBehavior.attach(this);
        }
    }

    function checkIfCombinationChanged(props) {
        if (this._propertyCombinations) {
            var combination = this._propertyCombinations.properties;
            var updateCombination = false;
            if (props.zOrder !== undefined) {
                updateCombination = true;
            }
            for (var i = 0; i < combination.length; ++i) {
                if (props[combination[i]] !== undefined) {
                    updateCombination = true;
                    break;
                }
            }
            if (updateCombination) {
                updateFromCombination.call(this);
            }
        }
    }

    return {
        _constructor: function () {
            this.setProps({clipSelf: true});

            this._mode = "draw";
            this._templateSubscription = null;
            this._activeBindings = [];
            this._inactiveBindings = [];
            //this._customProperties = [];
            this._disposableObjects = [];

            updateDropPositioning.call(this);

            this._recorder = new TemplateStateRecorder(this);
            this._created = true;
        },

        propsUpdated: function (props, oldProps) {
            Container.prototype.propsUpdated.apply(this, arguments);
            if(!this._created){
                return;
            }

            if (props.arrangeStrategy && props.arrangeStrategy !== oldProps.arrangeStrategy) {
                updateDropPositioning.call(this);
            }

            if (props.templateId && props.templateId !== oldProps.templateId) {
                onTemplateIdChanged.call(this, props.templateId);
            }

            if (props.state) {
                onStateChanged.call(this, props.state);
            }

            if (props.width !== undefined || props.height !== undefined) {
                if (this._currentBehavior) {
                    this._currentBehavior.resized();
                }
            }

            registerPropertyStateOverride.call(this, props);

            if (this._currentBehavior) {
                this._currentBehavior.propertiesChanged(props, oldProps);
            }

            checkIfCombinationChanged.call(this, props);

            var bindings = this._activeBindings;
            for(var i = 0; i < bindings.length; ++i) {
                var b = bindings[i];
                if(props[b.sourcePropertyName] !== undefined ){
                    b.update();
                }
            }
        },

        modifyContextBeforeDrawChildren: function (context) {
            if (this.scaleContent()) {
                var scaleX = this.width() / this._originalWidth;
                var scaleY = this.height() / this._originalHeight;
                context.scale(scaleX, scaleY);
            }
        },

        updatingTemplate: function () {
        },
        updatedTemplate: function () {
            updateBehavior.call(this);
        },
        states: function (value) {
            if (value !== undefined) {
                this.setProps({states: value});
            }
            return this.props.states;
        },
        renameState: function (oldName, newName) {
            this._recorder.renameState(oldName, newName);
        },
        behavior: function (value) {
            if (value !== undefined) {
                this.setProps({behavior: value});
            }
            return this.props.behavior;
        },
        childrenBehaviors: function (value) {
            return this.field("_childrenBehaviors", value, null);
        },
        defaultActionJSON: function (value) {
            return this.field("_defaultActionJSON", value, null);
        },
        edit: function () {
            if (this._mode === "draw") {
                edit.call(this);
            }
        },
        cancelEditing: function () {
            if (this._mode === "edit") {
                completeEditing.call(this, false);
            }
        },
        save: function () {
            if (this._mode === "edit") {
                completeEditing.call(this, true);
            }
        },
        mode: function () {
            return this._mode;
        },
        acceptedTags: function (value) {
            return this.field("_acceptedTags", value, null);
        },
        compositeElement: function (value) {
            return this.field("_compositeElement", value, null);
        },
        acquiringChild: function (element) {
            ensureElementName(element);
            var hitVisible = false;
            if (App.Current && App.Current.viewModel && App.Current.viewModel.isPreviewMode()) {
                hitVisible = true;
            }

            if (!hasPromotedContainer.call(this)) {
                if (this._mode === "draw") {
                    element.applyVisitor(function (e)
                    {
                         e.hitVisible(hitVisible);
                         e.canSelect(false);
                         e.acceptDisabled(true);
                    });
                }
            }
            fwk.TemplatedElement.prototype.SuperKlass.acquiringChild.apply(this, arguments);
        },
        templateId: function (value) {
            if (value !== undefined) {
                this.setProps({templateId: value});
            }
            return this.props.templateId;
        },
        promotedContainerName: function (value) {
            if (value !== undefined) {
                this.setProps({promotedContainerName: value});
            }
            return this.props.promotedContainerName;
        },
        toolboxTileType: function (value) {
            if (value !== undefined) {
                this.setProps({toolboxTileType: value});
            }
            return this.props.toolboxTileType;
        },
        scaleContent: function (value) {
            if (value !== undefined) {
                this.setProps({scaleContent: value});
            }
            return this.props.scaleContent;
        },
        getTemplate: function () {
            return fwk.Resources.getTemplate(this.templateId());
        },
        system: function () {
            return this.getTemplate().system();
        },
        getDescription: function () {
            return this.name();
        },
        global2localDropPosition: function (pos) {
            if (isPromotedContainerNotSelf.call(this)) {
                return this._promotedContainer.global2local(pos);
            }
            else {
                return this.global2local(pos);
            }
        },
        getDropData: function (pos, element) {
            if (isPromotedContainerNotSelf.call(this)) {
                return this._promotedContainer.getDropData(pos, element);
            }
            else {
                return fwk.TemplatedElement.prototype.SuperKlass.getDropData.apply(this, arguments);
            }
        },
        assignTemplate: function (template) {
            this.setProps({templateId: template.templateId()});
        },
        //addCustomProperty: function (name, type, description, defaultValue) {
        //    var property = {propertyName:name, type:type, description:description,defaultValue:defaultValue};
        //
        //    this.getTemplate().addCustomProperty(property);
        //    //this._customProperties.push(property);
        //    return property;
        //},
        //removeCustomProperty: function (propertyName) {
        //    this.getTemplate().removeCustomProperty(propertyName);
        //    sketch.util.spliceStrict(this._customProperties, function (p) {
        //        return p.propertyName === propertyName;
        //    });
        //    //this.properties.removeProperty(property);
        //    var bindings = this.getPropertyBindings();
        //    sketch.util.spliceStrict(bindings, function (b) {
        //        return b.sourcePropertyName === propertyName;
        //    });
        //},
        addPropertyBinding: function (sourcePropertyName, targetElement, targetPropertyName) {
            var binding = new PropertyBinding();
            binding.init(this.getTemplate(), sourcePropertyName, targetElement, targetPropertyName);
            this.getTemplate().addPropertyBinding(binding);
            return binding;
        },
        getPropertyBindings: function () {
            return this.getTemplate().getPropertyBindings();
        },
        findBoundElement: function (propertyName) {
            var element = null;
            var bindings = this.getPropertyBindings();
            if (bindings) {
                for (var i = 0; i < bindings.length; i++) {
                    var binding = bindings[i];
                    if (binding.sourcePropertyName === propertyName) {
                        element = this.findElementByName(binding.targetElementName);
                        break;
                    }
                }
            }
            return element;
        },
        findBinding: function (propertyName) {
            var bindings = this.getPropertyBindings();
            if (bindings) {
                for (var i = 0; i < bindings.length; i++) {
                    var binding = bindings[i];
                    if (binding.sourcePropertyName === propertyName) {
                        return binding;
                    }
                }
            }
            return null;
        },
        findCustomProperty: function (name) {
            var properties = this.getCustomProperties();
            if (properties) {
                for (var i = 0; i < properties.length; i++) {
                    var property = properties[i];
                    if (property.propertyName === name) {
                        return property;
                    }
                }
            }
            return null;
        },
        setCombinations: function (propertyCombinations) {
            this._propertyCombinations = propertyCombinations;
            if (propertyCombinations) {
                updateFromCombination.call(this);
            }
        },
        toJSON: function (includeDefaults) {
            var data = fwk.UIElement.prototype.toJSON.call(this, includeDefaults);

            if (hasPromotedContainer.call(this) && this._mode === 'draw') {
                var children = [];
                this._promotedContainer.children.each(function (_, element) {
                    if (!element.isTemporary()) {
                        children.push(element.toJSON(includeDefaults));
                    }
                });
                data.children = children;
            }
            //children needed for html rendering
            else if (includeDefaults) {
                var children = [];
                this.children.each(function (_, element) {
                    if (!element.isTemporary()) {
                        children.push(element.toJSON(includeDefaults));
                    }
                });
                data.children = children;
            }

            if (this._currentBehavior) {
                this._currentBehavior.save(data, includeDefaults);
            }

            if (this._states) {
                data.states = extend(true, {}, this._states);
            }

            if (includeDefaults) {
                var states = this.states();
                for (var stateName in states) {
                    var state = states[stateName];
                    var rootConfig = state.Root;
                    if (rootConfig) {
                        for (var propertyName in rootConfig) {
                            var property = this.properties[propertyName];
                            property.toJSON(includeDefaults, data.properties);
                        }
                    }
                }
            }

            return data;
        },
        fromJSON: function (data) {
            var template = fwk.Resources.getTemplate(data.properties.templateId);
            if (template) {
                this.setProps({templateId: template.templateId()});
            }

            if (this._childrenBehavior) {
                this._childrenBehavior.dispose();
                delete this._childrenBehavior;
            }

            fwk.UIElement.prototype.fromJSON.call(this, data);
            this._recorder.initFromJSON(this.states());

            var children;
            if (hasPromotedContainer.call(this) && this._mode === 'draw') {
                var that = this;
                if (data.children) {
                    children = [];
                    each(data.children, function (element) {
                        var child = fwk.UIElement.fromJSON(element);
                        that._promotedContainer.add(child);
                        children.push(child);
                    });
                }
            }

            if (this._currentBehavior) {
                this._currentBehavior.load(data);
            }
            var childrenBehaviors = this.getAssignedChildrenBehaviors();
            if (childrenBehaviors) {
                this.setChildrenBehaviors(childrenBehaviors);
            }

            this._states = data.states;

            applyStateOverrittenProperties.call(this, this.state());
        },
        exportPatch: function () {
            var data;
            if (this._currentBehavior) {
                data = {};
                this._currentBehavior.save(data);
            }

            return data;
        },
        applyPatch: function (data) {
            if (this._currentBehavior) {
                this._currentBehavior.load(data);
            }
        },
        updateBindings: function (newBindings) {
            updateBindings.call(this, this.getTemplate(), newBindings, true);
        },
        hasState: function (stateName) {
            return this._recorder.hasState(stateName);
        },
        updateTemplate: function () {
            var template = this.getTemplate();

            var propertyNames = this.getEditableProperties();
            propertyNames.push("states");

            template.updateDefaultPropertyValues(propertyNames, this.props);

            var that = this;
            var fieldValues = [];
            each(Klass.PersistentFields, function (f) {
                var value = that[f]();
                if (value !== fwk.UIElement.FieldMetadata[f].defaultValue) {
                    fieldValues.push({name: f, value: value});
                }
            });
            template.updatePersistentFields(fieldValues);

            template.updateFromContainer(this);
        },
        //getCustomProperties: function () {
        //    return this._customProperties;
        //},
        displayType: function () {
            var template = this.getTemplate();
            if (template) {
                return template.templateName();
            }
            return "Asset";
        },
        systemType: function () {
            var template = this.getTemplate();
            if (template) {
                return template.templateId();
            }
            return this.__type__;
        },
        canAccept: function (element) {
            if (this._mode !== "edit") {
                if (!element.canBeAccepted(this)) {
                    return false;
                }

                if (!hasPromotedContainer.call(this)) {
                    return false;
                }

                if (this.acceptDisabled()) {
                    return false;
                }

                if ((element instanceof fwk.TemplatedElement) && element.templateId() === this.templateId()) {
                    return false;
                }

                var tags = this.acceptedTags();
                if (!tags) {
                    return true;
                }

                return sketch.util.containsAny(tags.split(","), element.getTags());
            }

            return !containsSameTemplate.call(this, element);
        },
        isSameAs: function (element) {
            if (element === this) {
                return true;
            }

            if (this._mode === "edit") {
                return containsSameTemplate.call(this, element);
            }

            return false;
        },
        add: function (child) {
            if (this.__state === 1 || this._mode === "edit") {
                fwk.TemplatedElement.prototype.SuperKlass.add.apply(this, arguments);
            }
            else if (isPromotedContainerNotSelf.call(this)) {
                child.x(child.x() - this._promotedContainer.x());
                child.y(child.y() - this._promotedContainer.y());
                this._promotedContainer.add(child);
            }
            else {
                fwk.TemplatedElement.prototype.SuperKlass.add.apply(this, arguments);
            }
        },
        insert: function (/*UIElement*/element, /*int*/index) {
            if (isPromotedContainerNotSelf.call(this)) {
                this._promotedContainer.insert(element, index);
            }
            else {
                fwk.TemplatedElement.prototype.SuperKlass.insert.apply(this, arguments);
            }
        },
        changePosition: function (/*UIElement*/element, /*int*/index, /*bool*/ rearange) {
            if (isPromotedContainerNotSelf.call(this)) {
                this._promotedContainer.changePosition(element, index, rearange);
            }
            else {
                fwk.TemplatedElement.prototype.SuperKlass.changePosition.apply(this, arguments);
            }
        },
        remove: function (/*UIElement*/element) {
            if (isPromotedContainerNotSelf.call(this)) {
                this._promotedContainer.remove(element);
            }
            else {
                fwk.TemplatedElement.prototype.SuperKlass.remove.apply(this, arguments);
            }
        },
        clear: function () {
            if (isPromotedContainerNotSelf.call(this)) {
                this._promotedContainer.clear();
            }
            else {
                fwk.TemplatedElement.prototype.SuperKlass.clear.apply(this, arguments);
            }
        },
        getChildren: function () {
            if (isPromotedContainerNotSelf.call(this)) {
                return this._promotedContainer.children;
            }
            else {
                return fwk.TemplatedElement.prototype.SuperKlass.getChildren.apply(this, arguments);
                ;
            }
        },
        state: function (value) {
            if (value !== undefined) {
                this.setProps({state: value});
            }
            return this.props.state;
        },
        addState: function (name) {
            this._recorder.addState(name);
        },
        duplicateState: function (name, newName) {
            this._recorder.duplicateState(name, newName);
        },
        removeState: function (name) {
            this._recorder.removeState(name);
        },
        setStateProperties: function (stateName, properties) {
            var state = this._states[stateName];
            if (!state) {
                return;
            }
            state.properties = extend(true, {}, properties);
        },
        getAssignedChildrenBehaviors: function () {
            var result = [];
            var behaviors = this.childrenBehaviors();
            if (!behaviors) {
                return result;
            }
            for (var i = 0, l = behaviors.length; i < l; ++i) {
                result.push(fwk.UIElement.fromJSON(behaviors[i]));
            }
            return result;
        },
        persistChildrenBehaviors: function (behaviors) {
            if (!behaviors.length) {
                this.childrenBehaviors(null);
                return;
            }
            var data = [];
            for (var i = 0, l = behaviors.length; i < l; ++i) {
                data.push(behaviors[i].toJSON());
            }
            this.childrenBehaviors(data);
        },
        addChildrenBehavior: function (behavior) {
            if (this._childrenBehavior) {
                this._childrenBehavior.dispose();
            }
            var behaviors = this.getAssignedChildrenBehaviors();
            behaviors.push(behavior);
            this.setChildrenBehaviors(behaviors);
        },
        removeChildrenBehavior: function (behavior) {
            var behaviors = this.getAssignedChildrenBehaviors();
            for (var i = 0, l = behaviors.length; i < l; ++i) {
                if (behaviors[i].__type__ === behavior.__type__) {
                    behaviors.splice(i, 1);
                    break;
                }
            }
            this.setChildrenBehaviors(behaviors);
        },
        setChildrenBehavior: function (behavior) {
            this._childrenBehavior = behavior;
            this._childrenBehavior.attach(getActualChildrenContainer.call(this));
        },
        setChildrenBehaviors: function (behaviors) {
            if (behaviors.length === 1) {
                this.setChildrenBehavior(behaviors[0]);
            }
            else if (behaviors.length > 1) {
                this.setChildrenBehavior(new CompositeBehavior(behaviors));
            }
            this.persistChildrenBehaviors(behaviors);
        },
        bindStateChanged: function () {
            if (!this.stateChanged) {
                this.stateChanged = fwk.EventHelper.createEvent();
            }
            this.stateChanged.bind.apply(this.stateChanged, arguments);
        },
        unbindStateChanged: function () {
            if (!this.stateChanged) {
                return;
            }
            this.stateChanged.unbind.apply(this.stateChanged, arguments);
            if (!this.stateChanged.subscribers) {
                delete this.stateChanged;
            }
        },
        defaultAction: function () {
            if (this._defaultAction) {
                return this._defaultAction;
            }
            var json = this.defaultActionJSON();
            if (json) {
                this._defaultAction = fwk.UIElement.fromJSON(json);
                return this._defaultAction;
            }
            return fwk.TemplatedElement.prototype.SuperKlass.defaultAction.apply(this, arguments);
            ;
        },

        registerForDispose: function (disposable) {
            this._disposableObjects.push(disposable);
        },

        trackPropertyState: function (name) {
            var currentState = this._recorder.getState('default');
            if (currentState.hasValue('Root', name)) {
                return this.state();
            }

            return null;
        },

        dispose: function () {
            if (this._childrenBehavior) {
                this._childrenBehavior.dispose();
                delete this._childrenBehavior;
            }
            if (this._currentBehavior) {
                this._currentBehavior.detach();
                delete this._currentBehavior;
            }
            if (this._templateSubscription) {
                this._templateSubscription.dispose();
                delete this._templateSubscription;
            }

            if (this._templateSubscription) {
                this._templateSubscription.dispose();
                delete this._templateSubscription;
            }
            fwk.TemplatedElement.prototype.SuperKlass.dispose.apply(this, arguments);
        }
    };
})());

Klass.createFromTemplate = function (template) {
    var e = new fwk.TemplatedElement();
    e.assignTemplate(template);
    return e;
};

Klass.PersistentFields = ["autoPosition", "tags", "acceptedTags", "quickEditProperty", "resizeDimensions", "allowSnapping", "childrenBehaviors", "defaultActionJSON", "standardBackground", "compositeElement"];

extend(fwk.UIElement.FieldMetadata, {
    acceptedTags: {
        defaultValue: null,
        type: fwk.PropertyTypes.text,
        displayName: "Accepted tags"
    },
    standardBackground: {
        defaultValue: true,
        type: fwk.PropertyTypes.trueFalse,
        displayName: "Default background"
    },
    compositeElement: {
        defaultValue: false,
        type: fwk.PropertyTypes.trueFalse,
        displayName: "Composite element"
    },
    quickEditProperty: {
        defaultValue: "",
        type: fwk.PropertyTypes.text,
        displayName: "Quick edit"
    },
    childrenBehaviors: {
        defaultValue: null,
        editable: false
    },
    defaultActionJSON: {
        defaultValue: null,
        editable: false
    }
});

fwk.PropertyMetadata.extend("sketch.framework.Container", {
    "sketch.framework.TemplatedElement": {
        templateId: {
            displayName: "Template ID",
            type: "text",
            useInModel: true,
            defaultValue: 0
        },
        arrangeStrategy: {
            displayName: "Arrange method",
            type: "choice",
            useInModel: true,
            editable: false,
            defaultValue: "canvas"
        },
        promotedContainerName: {
            displayName: "Exposed container",
            type: "text",
            useInModel: true,
            editable: false,
            defaultValue: ""
        },
        state: {
            defaultValue: "default",
            stateless: true
        },
        states: {
            displayName: "States",
            defaultValue: {}
        },
        behavior: {
            displayName: "Behavior",
            type: "choice",
            possibleValues: getPossibleBehaviors(),
            useInModel: true,
            editable: false,
            defaultValue: ""
        },
        toolboxTileType: {
            displayName: "Tile type",
            type: "choice",
            possibleValues: {1: "S", 2: "L", 3: "XL"},
            useInModel: true,
            editable: false,
            defaultValue: 1
        },
        scaleContent: {
            displayName: "Scale content",
            type: "trueFalse",
            possibleValues: getPossibleBehaviors(),
            useInModel: true,
            editable: false,
            defaultValue: false
        }
    }
});

export default Klass;
