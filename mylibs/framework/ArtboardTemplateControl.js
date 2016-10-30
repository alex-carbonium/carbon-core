import PropertyMetadata from "framework/PropertyMetadata";
import PropertyStateRecorder from "framework/PropertyStateRecorder";
import Container from "framework/Container";
import UIElement from "framework/UIElement";
import {Overflow, ChangeMode, Types} from "./Defs";
import Selection from "framework/SelectionModel";

export default class ArtboardTemplateControl extends UIElement {
    constructor() {
        super();
    }

    unwrapToParent(){
        var parent = this.parent();
        var children = this._container.children;
        var x = this.x();
        var y = this.y();
        var selection = [];
        for(var i = 0; i < children.length; ++i){
            var child = children[i].clone();
            parent.add(child);
            child.initId();
            App.Current.activePage.nameProvider.assignNewName(child);
            child.x(child.x() + x);
            child.y(child.y() + y);
            selection.push(child);
        }
        parent.remove(this);

        Selection.makeSelection(selection);
    }

    _initFromArtboard() {
        var artboard = this._artboard;
        if (!artboard) {
            return;
        }

        this._allowHResize = this._artboard.props.allowHorizontalResize;
        this._allowVResize = this._artboard.props.allowVerticalResize;

        var props = {};
        if (!this._allowHResize) {
            props.width = artboard.width();
        }

        if (!this._allowVResize) {
            props.height = artboard.height();
        }
        this.setProps(props);
        this.setProps({_unwrapContent:artboard.props.insertAsContent});

        this._cloneFromArtboard(artboard);

        this._setupCustomProperties(artboard);

        if (this.props.stateId) {
            this._changeState(this.props.stateId);
        }

        this._updateCustomProperties();

        this.runtimeProps.artboardVersion = artboard.runtimeProps.version;

        if(!this.props.width || !this.props.height){
            this.setProps({width:this._artboard.width(), height:this._artboard.height()});
        }

        if (this._container && (this._allowHResize || this._allowVResize)) {
            this._container.setProps({
                width: this._allowHResize ? this.width() : artboard.width(),
                height: this._allowVResize ? this.height() : artboard.height()
            }, ChangeMode.Self);
            this._container.arrange({oldValue: artboard.getBoundaryRect(), newValue: this.getBoundaryRect()}, null, ChangeMode.Self);
        }
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

            var newName = 'custom:' + prop.propertyName;
            if (this.props['owt:' + prop.propertyName] !== true) {
                res[newName] = child.props[prop.propertyName];
            }
            propertyMapping[newName] = prop;
        }

        this.setProps(res);
    }

    updateViewMatrix() {
        super.updateViewMatrix();
        this._container && this._container.updateViewMatrix();
    }

    displayType(){
        if(this._artboard){
            return this._artboard.name() + ' {index}';
        }

        return "Element {index}"
    }

    _cloneFromArtboard(artboard) {
        var container = this._container = new Container();
        container.parent(this);
        container.setProps({
            width: artboard.width(),
            height: artboard.height(),
            id: artboard.id(),
            arrangeStrategy: artboard.props.arrangeStrategy
        }, ChangeMode.Self);


        for (var i = 0; i < artboard.children.length; i++) {
            var child = artboard.children[i];
            var clone = child.clone();
            clone.id(child.id())
            container.add(clone, ChangeMode.Self);
        }
    };

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
            if (props.source.pageId !== oldProps.source.pageId && props.source.artboardId !== oldProps.source.artboardId) {
                var page = App.Current.getPageById(props.source.pageId);
                if (page) {
                    this._artboard = page.getArtboardById(props.source.artboardId);
                }
                delete this.runtimeProps.artboardVersion;
            }

            this._initFromArtboard();
        }
        else {
            if (this._container && (props.width !== undefined || props.height !== undefined)) {
                var oldSize = this._container.size();
                var newSize = this.size();
                this._container.setProps(newSize, ChangeMode.Self);
                this._container.arrange({oldValue: oldSize, newValue: newSize}, null, ChangeMode.Self);
            }

            if (props.stateId !== undefined) {
                this._changeState(props.stateId);
            }

            this._updateCustomProperties();
        }
    }

    _changeState(stateId) {
        var defaultState = this._artboard._recorder.getStateById('default');

        this._container.setProps({
            width: this._artboard.width(),
            height: this._artboard.height()}
            , ChangeMode.Self);

        PropertyStateRecorder.applyState(this._container, defaultState);
        if (stateId !== 'default') {
            var newState = this._artboard._recorder.getStateById(stateId);
            PropertyStateRecorder.applyState(this._container, newState);
        }

        this._container.setProps({
            width: this.width(),
            height: this.height()
        }, ChangeMode.Self);

        this._container.arrange({oldValue: this._artboard.getBoundaryRect(), newValue: this.getBoundaryRect()}, null, ChangeMode.Self);
    }

    _updateCustomProperties() {
        if (!this._container) {
            return;
        }

        var props = this.props;
        for (var propName in props) {
            if (propName.startsWith('custom:')) {
                var prop = this._propertyMapping[propName];
                var elementId = prop.controlId;
                var element = this._container.getElementById(elementId);
                element.setProps({[prop.propertyName]: props[propName]}, ChangeMode.Self);
            }
        }
    }

    prepareProps(props) {
        for (var propName in props) {
            if (propName.startsWith('custom:')) {
                var prop = this._propertyMapping[propName];
                props['owt:' + prop.propertyName] = true;
            }
        }
    }

    getStates() {
        return this._artboard != null ? this._artboard.getStates() : [];
    }

    source(value) {
        if (arguments.length > 0) {
            this.setProps({source: value});
        }

        return this.props.source;
    }

    draw() {
        if (this._artboard && this.runtimeProps.artboardVersion !== this._artboard.runtimeProps.version) {
            this._initFromArtboard();
        }
        super.draw.apply(this, arguments);
    }

    innerChildren() {
        if (this._container) {
            return this._container.getChildren();
        }

        return null;
    }

    drawSelf() {
        if (this._container) {
            this._container.drawSelf.apply(this._container, arguments);
        } else {
            super.drawSelf.apply(this, arguments);
        }
    }

    canAccept() {
        return false;
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
    prepareVisibility: function (props, selection, view) {
        if (selection.elements) {
            var elements = selection.elements;
        } else {
            elements = [];
        }
        return {
            stateId: ((elements.length == 1) && elements[0]._artboard && elements[0]._artboard.props && elements[0]._artboard.props.states && elements[0]._artboard.props.states.length > 1)
        }
    },
    groups(){
        return [{
            label: "",
            properties: ["source"]
        }]
    }
})

