import PropertyMetadata from "framework/PropertyMetadata";
import PropertyStateRecorder from "framework/PropertyStateRecorder";
import Container from "framework/Container";
import UIElement from "framework/UIElement";
import { Overflow, Types } from "./Defs";
import Selection from "framework/SelectionModel";
import DataNode from "framework/DataNode";
import ObjectFactory from "framework/ObjectFactory";
import { ChangeMode, IArtboard, IMouseEventData, IIsolatable, IPrimitiveRoot, ISymbol, ISymbolProps, IApp, IUIElement, IUIElementProps, IText, UIElementFlags, ResizeDimension } from "carbon-core";
import { createUUID } from "../util";
import Isolate from "../commands/Isolate";
import Environment from "../environment";
import UserSettings from "../UserSettings";
import Text from "./text/Text";
import Brush from "./Brush";
import Font from "./Font";

interface ISymbolRuntimeProps extends IUIElementProps {
    artboardVersion: number;
    hasBg?: boolean;
    hasText?: boolean;
}

interface ICustomPropertyDefinition {
    controlId: string;
    propertyName: string;
}

export default class Symbol extends Container implements ISymbol, IPrimitiveRoot {
    props: ISymbolProps;
    runtimeProps: ISymbolRuntimeProps;

    private static flattening = false;

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

    allowNameTranslation() {
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

        var currentSize = this.boundaryRect();

        this.prepareAndSetProps({
            br: artboard.boundaryRect(),
            _unwrapContent: artboard.props.insertAsContent
        }, ChangeMode.Self);

        this._cloneFromArtboard(artboard);

        this._setupCustomProperties(artboard);

        if (this.props.stateId) {
            this._changeState(this.props.stateId);
        }

        if (this._allowHResize || this._allowVResize) {

            var br = this.boundaryRect();
            if (this._allowHResize) {
                br = br.withWidth(Math.max(currentSize.width || artboard.width(), artboard.minWidth()));
            }
            if (this._allowVResize) {
                br = br.withHeight(Math.max(currentSize.height || artboard.height(), artboard.minHeight()));
            }

            this.setProps({ br }, ChangeMode.Self);
            this.performArrange({ oldRect: artboard.boundaryRect(), newRect: br }, ChangeMode.Self);
        }

        this.updateCustomProperties(this.props);

        this.runtimeProps.artboardVersion = artboard.runtimeProps.version;

        // if (!this.props.width || !this.props.height) {
        //     this.setProps({width: this._artboard.width(), height: this._artboard.height()});
        // }

        this._initializing = false;
    }

    toJSON() {
        return { t: this.t, props: this.cloneProps() };
    }

    _setupCustomProperties(artboard) {
        var res: any = {};
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

        var backgrounds = this.findBackgrounds();
        if (backgrounds.length) {
            res.fill = backgrounds[0].fill();
            res.stroke = backgrounds[0].stroke();
        }
        var texts = this.findTexts();
        if (texts.length) {
            res.font = Font.extend(this.props.font, texts[0].font());
            if (this.props.hasOwnProperty("custom:self:font")) {
                res["custom:self:font"] = res.font;
            }
        }
        this.runtimeProps.hasBg = !!backgrounds.length;
        this.runtimeProps.hasText = !!texts.length;

        this.setProps(res, ChangeMode.Self);
    }

    displayType() {
        if (this._artboard) {
            return this._artboard.name();
        }

        return super.displayType();
    }

    _cloneFromArtboard(artboard) {
        this.clear(ChangeMode.Self);
        var baseId = this.id();

        for (var i = 0; i < artboard.children.length; i++) {
            var child = artboard.children[i];
            var clone = child.mirrorClone();
            clone.applyVisitor(x => {
                x.sourceId(x.id());
                x.id(baseId + x.id())
                x.canDrag(false);
                x.resizeDimensions(ResizeDimension.None);
            });
            this.add(clone, ChangeMode.Self);
        }
    };

    clone() {
        if (this._cloning) {
            throw new Error("Can't clone, chain contains recursive references");
        }
        this._cloning = true;
        var clone = UIElement.prototype.clone.apply(this, arguments);

        delete this._cloning;
        return clone;
    }

    systemType() {
        return this._artboard ? 'user:' + this._artboard.name() : super.systemType();
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

    propsUpdated(props, oldProps, mode) {
        super.propsUpdated(props, oldProps, mode);
        if (props.source !== undefined) {
            if (!this._artboard || (props.source.pageId !== oldProps.source.pageId && props.source.artboardId !== oldProps.source.artboardId)) {
                this._artboard = this.findSourceArtboard(App.Current);
                delete this.runtimeProps.artboardVersion;
            }

            this._initFromArtboard();
            return;
        }

        if (props.stateId !== undefined) {
            this._initFromArtboard();
            return;
        }

        if (mode !== ChangeMode.Self) {
            var changes = null;
            if (props.fill !== oldProps.fill) {
                let newName = "self:fill";
                changes = {};
                changes["custom:" + newName] = props.fill;
                changes["owt:" + newName] = true;
            }
            if (props.stroke !== oldProps.stroke) {
                let newName = "self:stroke";
                changes = changes || {};
                changes["custom:" + newName] = props.stroke;
                changes["owt:" + newName] = true;
            }
            if (props.font !== oldProps.font) {
                let newName = "self:font";
                changes = changes || {};
                changes["custom:" + newName] = props.font;
                changes["owt:" + newName] = true;
            }
            if (changes) {
                this.setProps(changes);
            }
            this.updateCustomProperties(props);
        }

        this.updateMarkedElements();
    }

    findSourceArtboard(app: IApp): IArtboard | null {
        var page = DataNode.getImmediateChildById(app, this.props.source.pageId);
        if (page) {
            return DataNode.getImmediateChildById(page, this.props.source.artboardId, true);
        }
        return null;
    }

    findClone(sourceId: string): IUIElement | null {
        return this.findNodeBreadthFirst(e => e.sourceId() === sourceId);
    }

    findBackgrounds(): IUIElement[] {
        return this.findAllNodesDepthFirst(x => x.hasFlags(UIElementFlags.SymbolBackground));
    }

    findTexts(): IText[] {
        return this.findAllNodesDepthFirst(x => x.hasFlags(UIElementFlags.SymbolText));
    }

    arrange(resizeEvent?, mode?) {
        this._arranging = true;
        super.arrange(resizeEvent, mode);
        this._arranging = false;
    }

    _changeState(stateId) {
        var defaultState = this._artboard._recorder.getStateById('default');

        PropertyStateRecorder.applyState(this, defaultState);
        if (stateId !== 'default') {
            var newState = this._artboard._recorder.getStateById(stateId);
            if (newState) {
                PropertyStateRecorder.applyState(this, newState);
            }
        }
    }

    _getCustomPropertyDefinition(propName): ICustomPropertyDefinition {
        if (!this._propertyMapping) {
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

    private _findElementWithCustomProperty(def: ICustomPropertyDefinition): UIElement | null {
        if (def.controlId === "self") {
            return this;
        }
        return this.getElementById(this.id() + def.controlId);
    }

    private updateCustomProperties(props) {
        for (var propName in props) {
            if (propName.startsWith('custom:')) {
                var prop = this._getCustomPropertyDefinition(propName);
                var element = this._findElementWithCustomProperty(prop);

                var value = props[propName];
                if (value === undefined) { // custom property was deleted, i.e by undo or reset property action
                    var sourceElement = element === this ? this._artboard : this._artboard.getElementById(element.sourceId());
                    delete this.props[propName];
                    value = sourceElement.props[prop.propertyName];
                }

                if (value && element) {
                    element.prepareAndSetProps({ [prop.propertyName]: value }, ChangeMode.Self);
                }
            } else if (props[propName] === undefined) {
                delete this.props[propName];
            }
        }

        this.updateMarkedElements();
    }

    private updateMarkedElements() {
        var backgrounds = this.findBackgrounds();
        if (backgrounds.length) {
            backgrounds.forEach(x => x.prepareAndSetProps({ fill: this.fill(), stroke: this.stroke() }, ChangeMode.Self));
        }
        var texts = this.findTexts();
        if (texts.length) {
            texts.forEach(x => x.prepareAndSetProps({ font: this.props.font }, ChangeMode.Self));
        }
    }

    prepareProps(props) {
        super.prepareProps(props);
        for (var propName in props) {
            if (propName.startsWith('custom:')) {
                var prop = this._getCustomPropertyDefinition(propName);
                props['owt:' + prop.controlId + ':' + prop.propertyName] = true;
            }
        }
    }

    getStates() {
        return this._artboard ? this._artboard.getStates() : [];
    }

    canAccept() {
        return false;
    }

    source(value?) {
        if (arguments.length > 0) {
            this.setProps({ source: value });
        }

        return this.props.source;
    }

    primitiveRoot(): IPrimitiveRoot & UIElement {
        if (!this.parent() || !this.parent().primitiveRoot()) {
            return null;
        }
        return this;
    }
    primitivePath() {
        var nextRoot = this.findNextRoot();
        if (!nextRoot) {
            return [];
        }
        var path = this.runtimeProps.primitivePath;
        if (!path) {
            path = nextRoot.primitivePath().slice();
            path[path.length - 1] = this.id();
            this.runtimeProps.primitivePath = path;
        }
        return path;
    }

    applySizeScaling(s, o, options, changeMode: ChangeMode = ChangeMode.Model) {
        super.applySizeScaling.apply(this, arguments);

        if (changeMode !== ChangeMode.Self) {
            var updatedProps = null;
            var propNames = Object.keys(this.props);
            for (var i = 0; i < propNames.length; i++) {
                var propName = propNames[i];
                if (propName.startsWith("custom:") && (propName.endsWith(":m") || propName.endsWith(":br"))) {
                    var def = this._getCustomPropertyDefinition(propName);
                    var element = this._findElementWithCustomProperty(def);
                    if (element && element !== this) {
                        var oldValue = this.props[propName];
                        var newValue = element.props[def.propertyName];
                        if (newValue !== oldValue) {
                            updatedProps = updatedProps || {};
                            updatedProps[propName] = newValue;
                        }
                    }
                }
            }

            if (updatedProps) {
                this.setProps(updatedProps);
            }
        }
    }

    trackInserted() {
        delete this.runtimeProps.primitivePath;
        super.trackInserted.apply(this, arguments);
    }
    trackDeleted(parent) {
        delete this.runtimeProps.primitivePath;
        super.trackDeleted.apply(this, arguments);
    }

    registerSetProps(element, props, oldProps, mode) {
        if (element.id() === this.id()) {
            var realRoot = this.findNextRoot();
            if (!realRoot) {
                return;
            }
            realRoot.registerSetProps(element, props, oldProps, mode);
            return;
        }

        if (this._registerSetProps || this._initializing || this._arranging) {
            return;
        }

        var propNames = Object.keys(props);
        var newProps = {};
        var fillStroke = null;
        var fontProps = null;
        var isBackground = element.hasFlags(UIElementFlags.SymbolBackground);
        var isText = element.hasFlags(UIElementFlags.SymbolText);

        for (var i = 0; i < propNames.length; ++i) {
            var propName = propNames[i];
            if (propName.startsWith("custom:")) {
                continue;
            }
            var newName = element.sourceId() + ":" + propName;
            var customPropName = "custom:" + newName;

            newProps[customPropName] = props[propName];
            newProps["owt:" + newName] = true;

            if (isBackground) {
                if (propName === "fill" || propName === "stroke") {
                    fillStroke = fillStroke || {};
                    fillStroke[propName] = props[propName]
                    newProps[propName] = props[propName];
                }
            }
            if (isText && propName === "font") {
                fontProps = fontProps || {};
                fontProps.font = props[propName];
                newProps[propName] = props[propName];
            }
        }

        this._registerSetProps = true;

        if (isBackground && fillStroke) {
            this.findBackgrounds().forEach(x => x.setProps(fillStroke));
        }
        if (isText && fontProps) {
            this.findTexts().forEach(x => x.setProps(fontProps));
        }

        this.setProps(newProps);
        this._registerSetProps = false;
    }

    registerDelete(parent: Container, element: UIElement, index: number, mode: ChangeMode = ChangeMode.Model) {
        if (mode === ChangeMode.Model && !Symbol.flattening) {
            element.setProps({ visible: false }, mode);
        }
    }

    isEditable() {
        return false;
    }

    isFinalRoot() {
        return false;
    }

    draw(context, environment?) {
        if (this._artboard && this.runtimeProps.artboardVersion !== this._artboard.runtimeProps.version) {
            this._initFromArtboard();
        }
        super.draw.apply(this, arguments);
    }

    standardBackground() {
        return !this.runtimeProps.hasBg;
    }

    getNonRepeatableProps(newProps) {
        var result = super.getNonRepeatableProps(newProps);
        if (!this._artboard) {
            return result;
        }

        var newPropsByElement = null;

        for (let propertyName in newProps) {
            if (propertyName.startsWith("custom:")) {
                var prop = this._getCustomPropertyDefinition(propertyName);
                newPropsByElement = newPropsByElement || {};
                var elementProps = newPropsByElement[prop.controlId];
                if (!elementProps) {
                    elementProps = {};
                    newPropsByElement[prop.controlId] = elementProps;
                }
                elementProps[prop.propertyName] = newProps[propertyName];
            }
        }

        if (newPropsByElement) {
            for (var elementId in newPropsByElement) {
                var element = this._artboard.getElementById(elementId);
                if (!element) {
                    continue;
                }

                var nonRepeatable = element.getNonRepeatableProps(newPropsByElement[elementId]);
                for (let i = 0; i < nonRepeatable.length; ++i) {
                    let propertyName = "custom:" + elementId + ":" + nonRepeatable[i];
                    if (result.indexOf(propertyName) === -1) {
                        result.push(propertyName);
                    }
                }
            }
        }

        return result;
    }

    dblclick(event: IMouseEventData) {
        var element = this.hitElementDirect(event, Environment.view.scale());
        if (element !== this) {
            Selection.makeSelection([element]);
        }

        //do not handle for text tool
        event.handled = false;
    }

    flatten() {
        Symbol.flattening = true;
        this.applyVisitor(x => {
            x.removeFlags(UIElementFlags.SymbolBackground | UIElementFlags.SymbolText);
            x.canDrag(true);
            x.resizeDimensions(ResizeDimension.Both);
        })
        super.flatten();
        Symbol.flattening = false;
    }
}
Symbol.prototype.t = Types.Symbol;


PropertyMetadata.registerForType(Symbol, {
    source: {
        // displayName: "Artboard",
        // type: "artboard",
        defaultValue: { artboardId: null, pageId: null }
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
    font: {
        displayName: "Font",
        type: "font",
        defaultValue: Font.Default,
        style: 2
    },
    prepareVisibility: function (element: Symbol) {
        return {
            font: !!element.runtimeProps.hasText,
            stateId: element._artboard && element._artboard.props
                && element._artboard.props.states
                && element._artboard.props.states.length > 1
        }
    },
    groups() {
        var groups = PropertyMetadata.findForType(Container).groups();
        groups = groups.slice();
        groups.splice(1, 0, {
            label: "@font",
            properties: ["font"]
        }, {
            label: "@symbol",
            properties: ["stateId"]
        });
        return groups;
    }
})

