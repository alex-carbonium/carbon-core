// TODO: cleanup properties with the same value
import PropertyTracker from "framework/PropertyTracker";
import { createUUID, deepEquals } from "../util";
import ObjectFactory from "framework/ObjectFactory";
import { ChangeMode, PatchType, IUIElement, IState } from "carbon-core";

function removeElement(state, elementId) {
    delete state.data[elementId];
}
function eachElement(state, callback) {
    for (var ctrlId in state.data) {
        callback(ctrlId);
    }
}
function eachElementAndProp(state, callback) {
    for (var ctrlId in state.data) {
        var props = state.data[ctrlId].props;
        for (var propName in props) {
            callback(ctrlId, propName, props[propName]);
        }
    }
}
function apply(toState: IState, fromStateName: string, element: any, animate: boolean) {
    if (animate) {
        let stateOptions;
        var stateAnimations = element.stateAnimations;
        if (stateAnimations) {
            let from = stateAnimations[fromStateName];
            if (from) {
                stateOptions = from[toState.name];
            }
        }

        element.applyVisitor((e:IUIElement) => {
            var elementData = toState.data[e.sourceId()];
            if (!elementData) {
                return;
            }
            ObjectFactory.updatePropsWithPrototype(elementData.props);
            let name = e.name;// ???? do we need to find ref to source element
            if (!stateOptions) {
                e.setProps(elementData.props, ChangeMode.Root);
            } else {
                if(stateOptions.elementOptions){
                    var elementOptions = stateOptions.elementOptions[name];
                }
                let propNames = Object.keys(elementData.props);

                for (var propName of propNames) {
                    let props = {};
                    let propOptions;
                    if(elementOptions){
                        propOptions = elementOptions[propName];
                    }
                    let options = stateOptions.defaultOptions;
                    if (propOptions) {
                        options = extend(extend({}, stateOptions.defaultOptions), propOptions);
                    }
                    props[propName] = elementData.props[propName];
                    e.animate(props, options);
                }
            }
        });
    } else {
        element.applyVisitor(e => {
            var elementData = toState.data[e.sourceId()];
            if (elementData) {
                ObjectFactory.updatePropsWithPrototype(elementData.props);
                e.setProps(elementData.props, ChangeMode.Root);
            }
        });
    }
}

function removeValue(state, elementId, propertyName) {
    var elementData = state.data[elementId];
    if (elementData) {
        delete elementData.props[propertyName];
        if (isEmptyObject(elementData.props)) {
            delete elementData[elementId];
        }
    }
}
function hasValue(state, elementId, propertyName) {
    var elementState = state.data[elementId];
    return elementState && elementState.props.hasOwnProperty(propertyName);
}

function getValue(state, elementId, propertyName) {
    var elementState = state.data[elementId];
    return !!elementState ? elementState.props[propertyName] : undefined;
}

function setProperty(state, elementId, propertyName, value) {
    var elementState = state.data[elementId];
    if (!elementState) {
        elementState = { props: {} };
        state.data[elementId] = elementState;
    }
    elementState.props[propertyName] = value;
}

function cleanUpStates() {
    cleanUpDeadControls.call(this);
}

function cleanUpDeadControls() {
    var elementsMap = {};
    this._element.applyVisitor(e => {
        elementsMap[e.sourceId()] = e;
    });
    for (var state of this.states) {
        var toRemove = [];
        eachElement(state, function (controlId) {
            if (!elementsMap[controlId]) {
                toRemove.push(controlId);
            }
        });
        for (var id of toRemove) {
            removeElement(state, id);
        }
    }
}

function cleanUpDefaultState(defaultState) {
    if (this.states.length === 0) {
        return;
    }
    var states = this.states;
    var toRemove = [];
    eachElementAndProp(defaultState, function (controlId, propertyName) {
        var valid = false;
        for (var i = 1; i < states.length; ++i) {
            if (hasValue(states[i], controlId, propertyName)) {
                valid = true;
                break;
            }
        }
        if (!valid) {
            toRemove.push([controlId, propertyName]);
        }
    });

    for (var tr of toRemove) {
        removeValue(defaultState, tr[0], tr[1]);
    }
}

function onPropertyChanged(data, defaultState, elementId, propName, newValue, oldValue) {
    if (!hasValue(defaultState, elementId, propName)) {
        setProperty(defaultState, elementId, propName, oldValue);
    } else {
        var currentValue = getValue(defaultState, elementId, propName);
        if (deepEquals(currentValue, newValue)) {
            removeValue(data, elementId, propName);
            return;
        }
    }
    setProperty(data, elementId, propName, newValue);
}

function processPropertyChanged(state, defaultState, elementId, newProps, oldProps) {
    if (this._changingState) {
        return;
    }
    for (var propName in newProps) {
        if (propName !== 'name' && propName !== 'state' && propName !== 'states'&& propName !== 'code') {
            onPropertyChanged.call(this, state, defaultState, elementId, propName, newProps[propName], oldProps[propName]);
        }
    }
}

function isEmptyObject(obj) {
    for (var p in obj) {
        if (obj.hasOwnProperty(p)) {
            return false;
        }
    }

    return true;
}

function addElementTracking(element) {
    // var elementsMap = this._elementsMaps;
    // element.applyVisitor(e=>{
    //     elementsMap[e.id] = e;
    // });

    // PropertyTracker.propertyChanged.bind(this, processPropertyChanged);
}

function disposeTracker() {
    // PropertyTracker.propertyChanged.unbind(this, processPropertyChanged);
}

function updateFromState(toState, fromState) {
    if (toState) {
        apply(toState, fromState, this._element, false);
    }
}

export default class PropertyStateRecorder {
    [name: string]: any;

    constructor(element) {
        this._trackingData = [];
        this._element = element;
        //this._elementsMaps = {};
        this._currentState = null;
    }

    getDefaultState() {
        return this.states.find(x => x.id === "default");
    }

    getState(stateName) {
        let defaultState = this.getDefaultState();
        if (!defaultState) {
            return null;
        }
        let state;
        for (var i = this.states.length - 1; i >= 0; --i) {
            if (this.states[i].name === stateName) {
                state = this.states[i];
                break;
            }
        }
        if (!state) {
            return null;
        }

        return this._mergeStates(defaultState, state);
    }

    getStateNameById(stateId) {
        for (var i = this.states.length - 1; i >= 0; --i) {
            if (this.states[i].id === stateId) {
                return this.states[i].name;
            }
        }

        return null;
    }

    _mergeStates(state1, state2) {
        var data = {};
        var state = {name:state2.name, id:state2.id, data:data}
        let data1 = state1.data;
        let data2 = state2.data;
        var keys1 = Object.keys(data1);
        for(let key1 of keys1) {
            data[key1] = {props:clone(data1[key1].props)}
        }

        var keys2 = Object.keys(data2);
        for(let key2 of keys2) {
            if(!data[key2]) {
                data[key2] = {props:clone(data2[key2].props)}
            } else {
                Object.assign(data[key2].props, data2[key2].props);
            }
        }
        return state;//extend(true, extend({}, state1), state2);
    }

    getStateById(stateId) {
        let defaultState = this.getDefaultState();
        if (!defaultState) {
            return null;
        }
        let state, res;
        for (var i = this.states.length - 1; i >= 0; --i) {
            if (this.states[i].id === stateId) {
                state = this.states[i];
                break;
            }
        }

        if (!state) {
            return null;
        }

        return this._mergeStates(defaultState, state);
    }

    addState(name, id) {
        if (this.states.length === 0) {
            var defaultState = { id: "default", name: "Default", data: {} };
            this._element.patchProps(PatchType.Insert, "states", defaultState);
        }
        var state = { id: id || createUUID(), name, data: {} };
        this._element.patchProps(PatchType.Insert, "states", state);
        return state;
    }

    statesCount() {
        return this.states.length;
    }

    removeState(stateName) {
        for (var i = this.states.length - 1; i >= 0; --i) {
            var state = this.states[i];
            if (state && state.name === stateName) {
                this._element.patchProps(PatchType.Remove, "states", state);
                break;
            }
        }
    }

    removeStateById(stateId) {
        if (stateId === 'default') {
            return;
        }

        var state = this.states.find(x => x.id === stateId);
        if (state) {
            this._element.patchProps(PatchType.Remove, "states", state);
        }
    }

    renameState(id, newName) {
        var state = this.getStateById(id);
        if (!state) {
            return;
        }
        var newState = clone(state, true);
        newState.name = newName;
        this._element.patchProps(PatchType.Change, "states", newState);
    }

    hasState(stateName) {
        for (var i = this.states.length - 1; i >= 0; --i) {
            if (this.states[i].name === stateName) {
                return true;
            }
        }
        return false;
    }

    hasStatePropValue(stateId, elementId, propName) {
        var state = this.getStateById(stateId);
        if (!state) {
            return false;
        }
        return hasValue(state, elementId, propName);
    }

    changeState(stateName) {
        this._changingState = true;
        this._currentState = this.getState(stateName);
        if (stateName !== 'Default') {
            updateFromState.call(this, this._currentState);
        }
        this._changingState = false;
    }

    duplicateState(stateName, newStateName) {
        var state = this.getState(stateName);
        if (!state) {
            return;
        }
        var newState = clone(state, true);
        newState.name = newStateName;
        this._element.patchProps(PatchType.Insert, "states", newState);
    }

    record() {
        addElementTracking.call(this, this._element);
        // this._recording = true;
    }

    stop() {
        // this._recording = false;
        cleanUpStates.call(this);
        disposeTracker.call(this);
    }

    get states() {
        return this._element.props.states;
    }

    initFromJSON(states) {
        this._changingState = true;
        this._currentState = this.getDefaultState();
        this._changingState = false;
    }

    trackSetProps(stateId, elementId, props, oldProps) {
        var state = this.getStateById(stateId);
        var newState = clone(state, true);
        var defaultState = clone(this.getDefaultState(), true);
        processPropertyChanged.call(this, newState, defaultState, elementId, props, oldProps);

        this._element.patchProps(PatchType.Change, "states", newState);

        if (newState.id !== defaultState.id) {
            cleanUpDefaultState.call(this, defaultState);
            this._element.patchProps(PatchType.Change, "states", defaultState);
        }
    }

    getValue(stateId, elementId, propName) {
        var state = this.getStateById(stateId);
        var elementData = state.data[elementId];
        if (!elementData) {
            return undefined;
        }
        return elementData.props[propName];
    }

    trackInsert(parent, element, index) {
    }

    trackDelete() {
    }

    trackChangePosition() {
    }

    static applyState(element: IUIElement, toState: IState, fromStateName: string, animate = false) {
        apply(toState, fromStateName, element, animate);
    }
}
