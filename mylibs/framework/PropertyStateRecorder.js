// TODO: cleanup properties with the same value
import PropertyTracker from "framework/PropertyTracker";
import {createUUID, deepEquals} from "../util";
import {PatchType, ChangeMode} from "./Defs";
import ObjectFactory from "framework/ObjectFactory";

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
function apply(state, element) {
    element.applyVisitor(e=> {
        var elementData = state.data[e.sourceId()];
        if (elementData) {
            ObjectFactory.updatePropsWithPrototype(elementData.props);
            e.setProps(elementData.props, ChangeMode.Root);
        }
    });
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
    if (!elementState){
        elementState = {props: {}};
        state.data[elementId] = elementState;
    }
    elementState.props[propertyName] = value;
}

function cleanUpStates() {
    cleanUpDeadControls.call(this);
}

function cleanUpDeadControls() {
    var elementsMap = {};
    this._element.applyVisitor(e=> {
        elementsMap[e.sourceId()] = e;
    });
    for (var state of this.states) {
        var toRemove = [];
        eachElement(state, function (controlId) {
            if (!elementsMap[controlId]) {
                toRemove.push(controlId);
            }
        });
        for (var id of toRemove){
            removeElement(state, id);
        }
    }
}

function cleanUpDefaultState(defaultState) {
    if (this.states.length === 0){
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

    for (var tr of toRemove){
        removeValue(defaultState, tr[0], tr[1]);
    }
}

function onPropertyChanged(data, defaultState, elementId, propName, newValue, oldValue) {
    if (!hasValue(defaultState, elementId, propName)) {
        setProperty(defaultState, elementId, propName, oldValue);
    } else {
        var currentValue = getValue(defaultState, elementId, propName);
        if(deepEquals(currentValue, newValue)) {
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
        if (propName !== 'name' && propName !== 'state' && propName !== 'states') {
            onPropertyChanged.call(this, state, defaultState, elementId, propName, newProps[propName], oldProps[propName]);
        }
    }
}

// function onLogEvent(primitives) {
//     var that = this;
//     primitives.forEach(e=> {
//         let cmd = e.id.command;
//
//         if (cmd === "element_new") {
//             if (that._elementsMap[e.id.parentId]) {
//                 var element = that._elementsMap[e.id.elementId] = that._element.getElementById(e.id.elementId);
//                 element.enablePropsTracking();
//             }
//         } else if (cmd === "element_delete") {
//             if (that._elementsMap[e.id.parentId]) {
//                 delete that._elementsMap[e.id.elementId];
//             }
//         } else if (cmd === "element_position_change") {
//             if (e.id.parentId !== e.data.oldParentId &&
//                 that._elementsMap[e.data.oldParentId] && !that._elementsMap[e.id.parentId]) {
//                 delete that._elementsMap[e.id.elementId];
//             }
//         }
//     })
// }

function addElementTracking(element) {
    // var elementsMap = this._elementsMaps;
    // element.applyVisitor(e=>{
    //     elementsMap[e.id] = e;
    // });

    // this.app.logEvent.bind(this, onLogEvent);
    // PropertyTracker.propertyChanged.bind(this, processPropertyChanged);
}

function disposeTracker() {
    // PropertyTracker.propertyChanged.unbind(this, processPropertyChanged);
    // this.app.logEvent.unbind(this, onLogEvent);
}

function updateFromState(state) {
    if (state) {
        apply(state, this._element);
    }
}

export default class PropertyStateRecorder {
    constructor(element) {
        this._trackingData = [];
        this._element = element;
        //this._elementsMaps = {};
        this._currentState = null;
    }

    getDefaultState(){
        return this.states.find(x => x.id === "default");
    }
    getState(stateName) {
        for (var i = this.states.length - 1; i >= 0; --i) {
            if (this.states[i].name === stateName) {
                return this.states[i];
            }
        }
        return null;
    }

    getStateById(stateId) {
        for (var i = this.states.length - 1; i >= 0; --i) {
            if (this.states[i].id === stateId) {
                return this.states[i];
            }
        }
        return null;
    }

    getStates() {
        return this.states;
    }

    addState(name, id) {
        if (this.states.length === 0){
            var defaultState = {id: "default", name: "Default", data: {}};
            this._element.patchProps(PatchType.Insert, "states", defaultState);
        }
        var state = {id: id || createUUID(), name, data: {}};
        this._element.patchProps(PatchType.Insert, "states", state);
        return state;
    }

    statesCount() {
        return this.states.length;
    }

    removeState(stateName) {
        for (var i = this.states.length - 1; i >= 0; --i) {
            var state = this.states[i];
            if (state.name === stateName) {
                this._element.patchProps(PatchType.Remove, "states", state);
                break;
            }
        }
    }

    removeStateById(stateId) {
        if(stateId ==='default'){
            return;
        }

        var state = this.states.find(x => x.id === stateId);
        this._element.patchProps(PatchType.Remove, "states", state);
    }

    renameState(id, newName) {
        var state = this.getStateById(id);
        if (!state){
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

    hasStatePropValue(stateId, elementId, propName){
        var state = this.getStateById(stateId);
        return hasValue(state, elementId, propName);
    }

    changeState(stateName) {
        this._changingState = true;
        updateFromState.call(this, this.getDefaultState());
        this._currentState = this.getState(stateName);
        if (stateName !== 'Default') {
            updateFromState.call(this, this._currentState);
        }
        this._changingState = false;
    }

    duplicateState(stateName, newStateName) {
        var state = this.getState(stateName);
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

    get states(){
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

        if(newState.id !== defaultState.id) {
            cleanUpDefaultState.call(this, defaultState);
            this._element.patchProps(PatchType.Change, "states", defaultState);
        }
    }

    getValue(stateId, elementId, propName){
        var state = this.getStateById(stateId);
        var elementData = state.data[elementId];
        if (!elementData){
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

    static applyState(element, state){
        apply(state, element);
    }
}
