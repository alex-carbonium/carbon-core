import PropertyMetadata from "framework/PropertyMetadata";
import PropertyStateRecorder from "framework/PropertyStateRecorder";
import Container from "framework/Container";
import UIElement from "framework/UIElement";
import {Overflow, ChangeMode} from "./Defs";

export default class ArtboardTemplateControl extends UIElement {
    constructor() {
        super();
    }

    _initFromArtboard() {
        var artboard = this._artboard;
        if (!artboard) {
            return;
        }

        this._allowHResize = this._artboard.props.allowHorizontalResize;
        this._allowVResize = this._artboard.props.allowVerticalResize;

        if (!this._allowHResize && !this._allowVResize) {
            var props = {width: artboard.width(), height: artboard.height()};
            this.setProps(props);
        }

        if (this._needToClone()) {
            this._cloneFromArtboard(artboard);
        }
        else {
            this._container = null;
        }


        this._setupCustomProperties(artboard);

        if (this.props.stateId) {
            this._changeState(this.props.stateId);
        }

        this._updateCustomProperties();

        this.runtimeProps.artboardVersion = artboard.runtimeProps.version;

        if (this._container && (this._allowHResize || this._allowVResize)) {
            this._container.setProps({
                width: this._allowHResize ? this.width() : artboard.width(),
                height: this._allowVResize ? this.height() : artboard.height()
            });
            this._container.arrange({oldValue: artboard.getBoundaryRect(), newValue: this.getBoundaryRect()});
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

    _cloneFromArtboard(artboard) {
        var container = this._container = new Container();
        container.setProps({
            width: artboard.width(),
            height: artboard.height(),
            id: artboard.id(),
            arrangeStrategy: artboard.props.arrangeStrategy
        });

        for (var i = 0; i < artboard.children.length; i++) {
            var child = artboard.children[i];
            var clone = child.clone();
            clone.locked(true);
            clone.id(child.id())
            container.add(clone, ChangeMode.Root);
        }
    };

    systemType() {
        return this._artboard != null ? 'user:' + this._artboard.name() : super.systemType();
    }

    _needToClone() {
        return (this._allowHResize && this.width() !== this._artboard.width())
            || (this._allowVResize && this.height() !== this._artboard.height())
        || this._artboard.props.customProperties.length
        || this._artboard._recorder.statesCount() > 1;
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
        if(this._allowVResize){
            return 1;
        }

        if(this._allowHResize){
            return 2;
        }
    }

    propsUpdated(props, oldProps) {
        super.propsUpdated(props, oldProps);
        if (props.source !== undefined) {
            if (props.source.pageId !== oldProps.source.pageId && props.source.artboardId !== oldProps.source.artboardId) {
                var page = App.Current.getPageById(props.source.pageId);
                if(page) {
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
                this._container.setProps(newSize, ChangeMode.Root);
                this._container.arrange({oldValue: oldSize, newValue: newSize});
            }

            if (props.stateId !== undefined) {
                this._changeState(props.stateId);
            }

            this._updateCustomProperties();
        }
    }

    _changeState(stateId) {
        var defaultState = this._artboard._recorder.getStateById('default');
        PropertyStateRecorder.applyState(this._container, defaultState);
        if (stateId !== 'default') {
            var newState = this._artboard._recorder.getStateById(stateId);
            PropertyStateRecorder.applyState(this._container, newState);
        }

        // size of container can be changed
        this.setProps({
            width: this._container.width(),
            height: this._container.height()
        });
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
                element.setProps({[prop.propertyName]: props[propName]});
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
        if (this._artboard) {
            return this._artboard.getChildren();
        }

        return null;
    }

    drawSelf() {
        if (this._container) {
            this._container.drawSelf.apply(this._container, arguments);
        } else if (this._artboard) {
            this._artboard.drawSelf.apply(this._artboard, arguments);
        } else {
            super.drawSelf.apply(this, arguments);
        }
    }

    canAccept() {
        return false;
    }
}


PropertyMetadata.registerForType(ArtboardTemplateControl, {
    width: {
        defaultValue: 200
    },
    height: {
        defaultValue: 200
    },
    source: {
        displayName: "Artboard",
        type: "artboard",
        defaultValue:{artboardId:null, pageId:null}
    },
    stateId: {
        displayName: "State",
        type: "state"
    },
    overflow: {
        defaultValue: Overflow.Clip
    },
    groups(){
        return [{
            label: "",
            properties: ["source"] // TODO:remove
        }]
    }
})

