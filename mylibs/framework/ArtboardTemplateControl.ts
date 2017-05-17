import PropertyMetadata from "framework/PropertyMetadata";
import PropertyStateRecorder from "framework/PropertyStateRecorder";
import Container from "framework/Container";
import UIElement from "framework/UIElement";
import {Overflow, Types} from "./Defs";
import Selection from "framework/SelectionModel";
import DataNode from "framework/DataNode";
import ObjectFactory from "framework/ObjectFactory";
import { ChangeMode } from "carbon-core";

export default class ArtboardTemplateControl extends Container {
    constructor() {
        super();
    }

    unwrapToParent() {
        var parent = this.parent();
        var children = this.children;
        var box = this.getBoundingBox();
        var x = box.x;
        var y = box.y;
        var selection = [];
        for (var i = 0; i < children.length; ++i) {
            var child = children[i].clone();
            parent.add(child);
            child.initId();
            App.Current.activePage.nameProvider.assignNewName(child);
            var childBox = child.getBoundingBox();
            child.x(childBox.x + x);
            child.y(childBox.y + y);
            selection.push(child);
        }
        parent.remove(this);

        return selection;
    }

    allowNameTranslation(){
        return false;
    }

    _initFromArtboard() {
        var artboard = this._artboard;
        if (!artboard) {
            return;
        }

        this._initializing = true;

        this._allowHResize = this._artboard.props.allowHorizontalResize;
        this._allowVResize = this._artboard.props.allowVerticalResize;

        var currentSize = this.getBoundaryRect();

        this.setProps({
            width: artboard.width(),
            height: artboard.height()
        }, ChangeMode.Self);

        this.setProps({_unwrapContent: artboard.props.insertAsContent}, ChangeMode.Self);

        this._cloneFromArtboard(artboard);

        this._setupCustomProperties(artboard);

        if (this.props.stateId) {
            this._changeState(this.props.stateId);
        }

        this._updateCustomProperties();

        this.runtimeProps.artboardVersion = artboard.runtimeProps.version;

        // if (!this.props.width || !this.props.height) {
        //     this.setProps({width: this._artboard.width(), height: this._artboard.height()});
        // }

        if (this._allowHResize || this._allowVResize) {

            var props: any = {};
            if (this._allowHResize) {
                props.width = currentSize.width || artboard.width();
            }
            if (this._allowVResize) {
                props.height = currentSize.height || artboard.height();
            }

            this.setProps(props, ChangeMode.Self);
        }

        this._initializing = false;
    }

    toJSON() {
        return UIElement.prototype.toJSON.apply(this, arguments);
    }

    _setupCustomProperties(artboard) {
        var res = {};
        var properties = artboard.props.customProperties;

        var childrenMap = {};
        var propertyMapping = this._propertyMapping = {};
        for (var i = 0; i < properties.length; ++i) {
            var prop = properties[i];
            var child = childrenMap[prop.controlId];
            if (!child) {
                child = artboard.getElementById(prop.controlId);
                childrenMap[prop.controlId] = child;
            }

            var newName = 'custom:' + prop.controlId + ':' + prop.propertyName;
            if (this.props['owt:' + prop.controlId + ':' + prop.propertyName] !== true) {
                res[newName] = child.props[prop.propertyName];
            }
            propertyMapping[newName] = prop;
        }

        this.setProps(res);
    }

    displayType() {
        if (this._artboard) {
            return this._artboard.name();
        }

        return super.displayType();
    }

    _cloneFromArtboard(artboard) {
        this.clear();

        for (var i = 0; i < artboard.children.length; i++) {
            var child = artboard.children[i];
            var clone = child.clone();
            clone.id(this.id() + child.id())
            clone.sourceId(child.id());
            clone.canDrag(false);
            clone.resizeDimensions(0);
            this.add(clone, ChangeMode.Self);
        }
    };

    clone() {
        if (this._cloning) {
            throw "Can't clone, chain contains recursive references";
        }
        this._cloning = true;
        var clone = UIElement.prototype.clone.apply(this, arguments);

        delete this._cloning;
        return clone;
    }

    systemType() {
        return this._artboard != null ? 'user:' + this._artboard.name() : super.systemType();
    }

    onArtboardChanged() {
        this._initFromArtboard();
    }

    resizeDimensions() {
        if (!this._allowHResize && !this._allowVResize) {
            return 0;
        }
        if (this._allowHResize && this._allowVResize) {
            return super.resizeDimensions();
        }
        if (this._allowVResize) {
            return 1;
        }

        if (this._allowHResize) {
            return 2;
        }
    }

    propsUpdated(props, oldProps) {
        super.propsUpdated(props, oldProps);
        if (props.source !== undefined) {
            if (!this._artboard || (props.source.pageId !== oldProps.source.pageId && props.source.artboardId !== oldProps.source.artboardId)) {
                var page = DataNode.getImmediateChildById(App.Current, props.source.pageId);
                if (page) {
                    this._artboard = DataNode.getImmediateChildById(page, props.source.artboardId, true);
                }
                delete this.runtimeProps.artboardVersion;
            }

            this._initFromArtboard();
        }
        else {
            if ((props.width !== undefined || props.height !== undefined)) {
                var newSize = this.size();
                var oldSize = {width: oldProps.width || newSize.width, height: oldProps.height || newSize.height};

                this.arrange({oldRect: oldSize, newRect: newSize}, ChangeMode.Self);
            }

            if (props.stateId !== undefined) {
                this._initFromArtboard();
            } else {
                this._updateCustomProperties();
            }
        }
    }

    arrange(resizeEvent, mode?){
        this._arranging = true;
        super.arrange(resizeEvent, mode);
        this._arranging = false;
    }

    _changeState(stateId) {
        var defaultState = this._artboard._recorder.getStateById('default');

        PropertyStateRecorder.applyState(this, defaultState);
        if (stateId !== 'default') {
            var newState = this._artboard._recorder.getStateById(stateId);
            if(newState) {
                PropertyStateRecorder.applyState(this, newState);
            }
        }
    }

    _getCustomPropertyDefinition(propName) {
        if(!this._propertyMapping) {
            this._propertyMapping = {};
        }

        var fromCache = this._propertyMapping[propName];

        if (fromCache) {
            return fromCache;
        }
        var splits = propName.split(':');
        var data = {
            controlId: splits[1],
            propertyName: splits[2]
        }

        this._propertyMapping[propName] = data;

        return data;
    }

    _updateCustomProperties() {
        var props = this.props;
        for (var propName in props) {
            if (propName.startsWith('custom:')) {
                var prop = this._getCustomPropertyDefinition(propName);
                var elementId = prop.controlId;
                var element = this.getElementById(this.id() + elementId);

                var value = props[propName];
                if(value === undefined) { // custom property was deleted, i.e by undo or reset property action
                    var sourceElement = this._artboard.getElementById(element.sourceId());
                    delete props[propName];
                    value = sourceElement.props[prop.propertyName];
                }

                if(value && element) {
                    element.prepareAndSetProps({[prop.propertyName]: value}, ChangeMode.Self);
                }
            } else if(props[propName] === undefined) {
                delete props[propName];
            }
        }
    }

    prepareProps(props) {
        for (var propName in props) {
            if (propName.startsWith('custom:')) {
                var prop = this._getCustomPropertyDefinition(propName);
                props['owt:' + prop.controlId + ':' + prop.propertyName] = true;
            }
        }
    }

    getStates() {
        return this._artboard != null ? this._artboard.getStates() : [];
    }

    canAccept() {
        return false;
    }

    source(value?) {
        if (arguments.length > 0) {
            this.setProps({source: value});
        }

        return this.props.source;
    }

    isAtomicInModel() {
        return true;
    }

    primitiveRoot() {
        if (!this.parent() || !this.parent().primitiveRoot()) {
            return null;
        }
        return this;
    }

    primitivePath() {
        var parent = this.parent();
        if (!parent || !parent.primitiveRoot()) {
            return null;
        }
        var path = this.runtimeProps.primitivePath;
        if (!path) {
            path = parent.primitivePath().slice();
            path[path.length - 1] = this.id();
            path.push(this.id());
            this.runtimeProps.primitivePath = path;
        }
        return path;
    }

    primitiveRootKey() {
        var parent = this.parent();
        if (!parent || !parent.primitiveRoot()) {
            return null;
        }
        var s = this.runtimeProps.primitiveRootKey;
        if (!s) {
            s = parent.id() + this.id();
            this.runtimeProps.primitiveRootKey = s;
        }
        return s;
    }

    relayout() {

    }

    relayoutCompleted() {

    }

    registerSetProps(element, props, oldProps, mode) {
        if (element.id() === this.id()) {
            var realRoot = this._realPrimitiveRoot();
            if (!realRoot){
                return;
            }
            realRoot.registerSetProps(element, props, oldProps, mode);
            return;
        }

        if(this._registerSetProps || this._initializing || this._arranging){
            return;
        }

        var propNames = Object.keys(props);
        var newProps = {};
        for (var i = 0; i < propNames.length; ++i) {
            var propName = propNames[i];
            if(propName.startsWith("custom:")){
                continue;
            }
            var newName = element.sourceId() + ":" + propName;
            newProps["custom:" + newName] = props[propName];
            newProps["owt:" + newName] = true;
        }

        this._registerSetProps = true;
        this.setProps(newProps);
        this._registerSetProps = false;
    }

    _realPrimitiveRoot(){
        var parent = this.parent();
        if (!parent){
            return null;
        }
        return parent.primitiveRoot();
    }

    draw(context) {
        if (this._artboard && this.runtimeProps.artboardVersion !== this._artboard.runtimeProps.version) {
            this._initFromArtboard();
        }
        super.draw.apply(this, arguments);
    }

    getNonRepeatableProps(newProps){
        var result = super.getNonRepeatableProps(newProps);
        if (!this._artboard){
            return result;
        }

        var newPropsByElement = null;

        for (let propertyName in newProps){
            if (propertyName.startsWith("custom:")){
                var prop = this._getCustomPropertyDefinition(propertyName);
                newPropsByElement = newPropsByElement || {};
                var elementProps = newPropsByElement[prop.controlId];
                if (!elementProps){
                    elementProps = {};
                    newPropsByElement[prop.controlId] = elementProps;
                }
                elementProps[prop.propertyName] = newProps[propertyName];
            }
        }

        if (newPropsByElement){
            for (var elementId in newPropsByElement){
                var element = this._artboard.getElementById(elementId);
                if (!element){
                    continue;
                }

                var nonRepeatable = element.getNonRepeatableProps(newPropsByElement[elementId]);
                for (let i = 0; i < nonRepeatable.length; ++i){
                    let propertyName = "custom:" + elementId + ":" + nonRepeatable[i];
                    if (result.indexOf(propertyName) === -1){
                        result.push(propertyName);
                    }
                }
            }
        }

        return result;
    }
}
ArtboardTemplateControl.prototype.t = Types.ArtboardTemplateControl;


PropertyMetadata.registerForType(ArtboardTemplateControl, {
    source: {
        displayName: "Artboard",
        type: "artboard",
        defaultValue: {artboardId: null, pageId: null}
    },
    stateId: {
        displayName: "State",
        type: "state"
    },
    overflow: {
        defaultValue: Overflow.Clip
    },
    allowMoveOutChildren: {
        defaultValue: false
    },
    enableGroupLocking: {
        defaultValue: true
    },
    prepareVisibility: function (element) {
        return {
            stateId: element._artboard && element._artboard.props
                && element._artboard.props.states
                && element._artboard.props.states.length > 1
        }
    },
    groups(){
        return [{
            label: "",
            properties: ["source"]
        }]
    }
})

