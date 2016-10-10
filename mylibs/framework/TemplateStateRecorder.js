define(function () {
    var fwk = sketch.framework;

    // TODO: cleanup properties with the same value
    // TODO: handle element rename
    klass2("sketch.framework.TemplateState", null, (function () {
        return {
            _constructor:function(){
                this._state = {};
                this.stateChanged = new fwk.EventHelper.createEvent();
            },
            setProperty:function(elementName, propertyName, value){
                var elementState = this._state[elementName] = this._state[elementName] || {};
                elementState[propertyName] = value;
                this.stateChanged.raise();
            },
            hasValue:function(elementName, propertyName){
                var elementState = this._state[elementName] = this._state[elementName] || {};
                return elementState.hasOwnProperty(propertyName);
            },
            getValue:function(elementName, propertyName){
                var elementState = this._state[elementName] = this._state[elementName] || {};
                return elementState[propertyName];
            },
            removeValue:function(elementName, propertyName){
                var state = this._state[elementName];
                if(state){
                    delete state[propertyName];
                    if(isEmptyObject(state)){
                        delete this._state[elementName];
                    }
                }
                this.stateChanged.raise();
            },
            apply:function(element){
                for(var elementName in this._state){
                    if(elementName === 'Root'){
                        var target = element;
                    } else {
                        target = element.findSingleChildOrDefault(function(el) {
                            return el.name() === elementName;
                        });
                    }
                    if(target){
                        var state = this._state[elementName];
                        var res = {};
                        for(var p in state){
                            var value = state[p];
                            if(value && value.__type__){
                                var json = value;
                                if(value.__type__ === "Font") { // HACK: to support default font change
                                    json.family = (json.family || fwk.Font.familyOverride) || undefined;
                                    //if(json.size) {
                                        //json.defaultSize = json.size;
                                        // json.size;
                                    //}
                                }
                                var clone = fwk.UIElement.fromType(value.__type__, json);
                                if (clone.readOnly && !clone.readOnly()){
                                    clone.setProps(json);
                                }
                                res[p] = clone;
                            } else {
                                res[p] = value;
                            }
                        }
                        target.setProps(res);
                    }
                }
            },
            each:function(callback){
                for(var ctrl in this._state){
                    for(var prop in this._state[ctrl]){
                        callback(ctrl, prop, this._state[ctrl][prop]);
                    }
                }
            },
            eachElement:function(callback){
                for(var ctrl in this._state){
                    callback(ctrl);
                }
            },
            removeElement:function(elementName){
                delete this._state[elementName];
                this.stateChanged.raise();
            },
            toJSON:function(){
                var state = this._state;
                var res = {};
                for(var name in state) {
                    var props = state[name];
                    var resProps = res[name] = {};
                    for(var p in props) {
                        var value = props[p];
                        if(value && value.__type__){
                            resProps[p] = value.getModelProperties();
                            resProps[p].__type__ = value.__type__;
                        } else {
                            resProps[p] = value;
                        }
                    }
                }
                return res;
            },
            initFromJSON:function(data){
                var state = {};
                for(var name in clone(data)){
                    var props = data[name];
                    var newProp = state[name] = {};
                    for(var p in props){
                        var value = props[p];
                        newProp[p] = value;
                        if(value && value.__type__){
                            var type = value.__type__;
                            delete value.__type__;
                            var element = fwk.UIElement.fromType(type, value);
                            value.__type__ = type;
                            if (element.readOnly && !element.readOnly()){
                                element.init(value);
                            }
                            newProp[p] = element;
                        }
                    }
                }
                this._state = state;
            }
        }
    })());


    return klass2("sketch.framework.TemplateStateRecorder", null, (function () {
        function cleanUpStates() {
            cleanUpDefaultState.call(this);
            cleanUpDeadControls.call(this);
        }

        function cleanUpDeadControls(){
            var names = {};
            for (var id in this._trackingData){
                var element = this._trackingData[id].element;
                if(element._isDisposed){
                    delete this._trackingData[id];
                } else {
                    var name = element.name();
                    if(element === this._element){
                        name = 'Root';
                    }
                    names[name] = true;
                }
            }
            for(var stateName in this.states){
                var state = this.states[stateName];
                var toRemove = [];
                state.eachElement(function(control){
                    if(!names[control]){
                        toRemove.push(control);
                    }
                });
                each(toRemove, function(tr){
                    state.removeElement(tr);
                })
            }
        }

        function cleanUpDefaultState() {
            var defaultState = this.states['default'];
            var states = [];
            for(var state in this.states){
                if(state !== 'default'){
                    states.push(this.states[state]);
                }
            }
            var toRemove = [];
            defaultState.each(function(control, property){
                var valid = false;
                for(var i = 0; i < states.length; ++i){
                    if(states[i].hasValue(control, property)){
                        valid = true;
                        break;
                    }
                }
                if(!valid){
                    toRemove.push([control,property]);
                }
            });

            each(toRemove, function(tr){
                defaultState.removeValue(tr[0], tr[1]);
            });
        }

        function onPropertyChanged(element, event){
            var name = element.name();
            if(event.stateless){
                return;
            }
            if(element === this._element){
                name = 'Root';
            }
            if(!this._defaultState.hasValue(name, event.propertyFullName)){

                this._defaultState.setProperty(name, event.propertyFullName, event.oldValue);
            }
            this._currentState.setProperty(name, event.propertyFullName, event.newValue);
            cleanUpStates.call(this);
        }

        function processPropertyChanged(element, events){
            if(this._changingState){
                return;
            }
            var that = this;
            each(events, function(event){
                if(event.newValue !== event.oldValue && event.useInModel){
                    onPropertyChanged.call(that, element, event);
                }
            });
        }

        function onCollectionChanged(event){
            if(event.action === 'added'){
                addElementTracking.call(this, event.element);
            } else if(event.action === 'removed'){
                removeElementTracking.call(this, event.element);
            } else if(event.action === 'cleared'){
                disposeTracker.call(this);
            }
        }

        function addElementTracking(element){
            var subscriptions = [];
            var that = this;

            var s = element.properties.bindPropertyChanged(function(events){
                processPropertyChanged.call(that, element, events);
            });
            subscriptions.push(s);

            if(element.getChildren){
                var children = element.getChildren();
                s = children.changed.bind(this, onCollectionChanged);
                subscriptions.push(s);
                children.each(function(i, child){
                    addElementTracking.call(that, child);
                });
            }

            this._trackingData[element.id()] = {
                element: element,
                subscriptions: subscriptions
            };
        }

        function removeElementTracking(element){
            var subscriptions = this._trackingData[element.id()].subscriptions;
            each(subscriptions, function(s){
                s.dispose();
            });

            delete this._trackingData[element.id()];
        }

        function disposeTracker(){
            for (var i in this._trackingData){
                each(this._trackingData[i].subscriptions, function(s){
                    s.dispose();
                })
            }

            this._trackingData = {};
        }

        function updateFromState(stateName){
            var state = this.getState(stateName);
            state.apply(this._element);
        }

        return {
            _constructor:function (element) {
                this._trackingData = [];
                this._states = {};
                this._element = element;
                this._defaultState = new fwk.TemplateState();

                this._currentState = this._defaultState;
                this._states['default'] = this._defaultState;
            },
            getState:function(stateName){
                return this._states[stateName];
            },
            getStates:function() {
                return this._states;
            },
            addState:function(stateName){
                return this._states[stateName] = new fwk.TemplateState();
            },
            removeState:function(stateName){
                delete this._states[stateName];
            },
            renameState:function(oldName, newName){
                this._states[newName] = this._states[oldName];
                delete this._states[oldName];
            },
            hasState:function(name) {
                return !!this._states[name];
            },
            changeState:function(stateName){
                this._changingState = true;
                updateFromState.call(this, "default");
                this._currentState = this._states[stateName];
                if(stateName !== 'default'){
                    updateFromState.call(this, stateName);
                }
                this._changingState = false;
            },
            duplicateState:function(stateName, newStateName){
                var state = this._states[stateName];
                var newState = new fwk.TemplateState();
                newState.initFromJSON(state.toJSON());
                this._states[newStateName] = newState;
            },
            record:function(){
                addElementTracking.call(this, this._element);
            },
            stop:function(){
                cleanUpStates.call(this);
                disposeTracker.call(this);
            },
            getStatesJSON:function(){
                return this._states.map(x => clone(x, true));
            },
            initFromJSON:function(data){
                this._changingState = true;
                for(var stateName in data){
                    var state = this.addState(stateName);
                    state.initFromJSON(data[stateName]);
                }
                this._defaultState = this._states['default'];
                this._currentState = this._defaultState;
                this._changingState = false;
            }
        }
    })());
});