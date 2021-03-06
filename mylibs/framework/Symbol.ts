import PropertyMetadata from "./PropertyMetadata";
import PropertyStateRecorder from "./PropertyStateRecorder";
import Container from "./Container";
import UIElement from "./UIElement";
import { Overflow, Types } from "./Defs";
import Selection from "./SelectionModel";
import DataNode from "./DataNode";
import ObjectFactory from "./ObjectFactory";
import { ChangeMode, IContainer, IMouseEventData, IIsolatable, IPrimitiveRoot, ISymbol, ISymbolProps, IApp, IUIElement, IUIElementProps, IText, UIElementFlags, ResizeDimension, IContext, ISelection, IArtboard, IAnimationOptions, IDisposable } from "carbon-core";
import { createUUID } from "../util";
import Isolate from "../commands/Isolate";
import UserSettings from "../UserSettings";
import Text from "./text/Text";
import Brush from "./Brush";
import Font from "./Font";
import NullContainer from "./NullContainer";
import { RuntimeProxy } from "../code/runtime/RuntimeProxy";
import EventHelper from "./EventHelper";
import { IEvent } from "carbon-basics";
import { AutoDisposable } from "../AutoDisposable";

interface ISymbolRuntimeProps extends IUIElementProps {
    artboardVersion: number;
    hasBg?: boolean;
    intUpd?: number;
}

interface ICustomPropertyDefinition {
    controlId: string;
    propertyName: string;
}

export default class Symbol extends Container implements ISymbol, IPrimitiveRoot {
    props: ISymbolProps;
    runtimeProps: ISymbolRuntimeProps;
    stateChanged:IEvent<string>;

    private static flattening = false;

    constructor() {
        super();
        this.stateChanged = EventHelper.createEvent();
    }

    allowNameTranslation() {
        return false;
    }

    _initFromArtboard() {
        var artboard = this._artboard;
        if (!artboard) {
            return;
        }

        this.beginInternalUpdate();

        this._allowHResize = this._artboard.props.allowHorizontalResize;
        this._allowVResize = this._artboard.props.allowVerticalResize;

        var currentSize = this.boundaryRect();

        this.prepareAndSetProps({ br: artboard.boundaryRect() }, ChangeMode.Self);

        this._cloneFromArtboard(artboard);

        this._setupCustomProperties(artboard);

        if (this._allowHResize || this._allowVResize) {
            var br = this.boundaryRect();
            if (this._allowHResize) {
                br = br.withWidth(Math.max(currentSize.width || artboard.width, artboard.minWidth()));
            }
            if (this._allowVResize) {
                br = br.withHeight(Math.max(currentSize.height || artboard.height, artboard.minHeight()));
            }

            this.updateCustomProperties(this.props);
            let oldRect = this.boundaryRect();
            this.setProps({ br }, ChangeMode.Self);
            this.performArrange({ oldRect: oldRect, newRect: br }, ChangeMode.Self);
        } else {
            this.updateCustomProperties(this.props);
        }

        this.runtimeProps.artboardVersion = artboard.runtimeProps.version;

        // if (!this.props.width || !this.props.height) {
        //     this.setProps({width: this._artboard.width, height: this._artboard.height});
        // }

        if (this.props.stateId) {
            this._changeState(this.props.stateId, "default", false);
        }

        this.endInternalUpdate();
    }

    screenSize() {
        return { width: this.width, height: this.height }
    }

    toJSON() {
        return { t: this.t, props: this.cloneProps() };
    }

    get exports() {
        if (!this.artboard) {
            return null;
        }

        return this.artboard.exports;
    }

    set exports(value) {
        if (!this.artboard) {
            return;
        }

        this.artboard.exports = value;
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
            res.fill = backgrounds[0].fill;
            res.stroke = backgrounds[0].stroke;
        }
        this.runtimeProps.hasBg = !!backgrounds.length;

        this.setProps(res, ChangeMode.Self);
    }

    displayType() {
        if (this._artboard) {
            return this._artboard.name;
        }

        return super.displayType();
    }

    mirrorClone() {
        if (this._cloning) {
            throw new Error("Can't clone, chain contains recursive references");
        }
        this._cloning = true;
        var clone = UIElement.prototype.mirrorClone.apply(this, arguments);

        delete this._cloning;
        return clone;
    }

    _cloneFromArtboard(artboard) {
        this.clear(ChangeMode.Self);
        var baseId = this.id;
        let ctxl = this.runtimeProps.ctxl;
        for (var i = 0; i < artboard.children.length; i++) {
            var child = artboard.children[i];
            var clone = child.mirrorClone();
            clone.applyVisitor(x => {
                if (x.id === x.sourceId()) {
                    x.sourceId(x.id);
                    x.id = (baseId + x.id)
                }
                x.resizeDimensions(ResizeDimension.None);
                x.runtimeProps.ctxl = ctxl;
            });
            clone.runtimeProps.stateController = this;
            this.add(clone, ChangeMode.Self);
        }

        if(artboard.props.renderBackground) {
            this.fill = artboard.fill;
        }
    };

    code() {
        if (this.artboard) {
            return this.artboard.code();
        }
        return null;
    }

    get codeVersion() {
        if (this.artboard) {
            return this.artboard.codeVersion;
        }
        return -1;
    }

    get version() {
        if (this.artboard) {
            return this.artboard.version;
        }
        return -1;
    }

    declaration() {
        if (this.artboard) {
            return this.artboard.declaration(true);
        }
        return null;
    }

    get compilationUnitId() {
        if (this.artboard) {
            return this.artboard.id;
        }
        return "";
    }

    clone() {
        if (this._cloning) {
            throw new Error("Can't clone, chain contains recursive references");
        }
        this._cloning = true;
        var clone = UIElement.prototype.clone.apply(this, arguments);

        delete this._cloning;
        return clone;
    }

    // systemType() {
    //     return this._artboard ? 'user:' + this._artboard.name : super.systemType();
    // }

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

        this.updateCustomProperties(props);

        if (props.stateId !== undefined) {
            this._changeState(props.stateId, oldProps.stateId);
            return;
        }
    }

    get artboard(): IArtboard {
        var artboard = this._artboard;
        if (!artboard) {
            return null;
        }
        return artboard;
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
        let autoGrow = resizeEvent && resizeEvent.autoGrow;
        if (!autoGrow) {
            this.beginInternalUpdate();
        }

        super.arrange(resizeEvent, mode);

        if (!autoGrow) {
            this.endInternalUpdate();
        }

        this._updateChildrenCustomProps(mode);
    }

    _updateChildrenCustomProps(mode) {
        let propNames = Object.keys(this.props);
        let changes = {};
        let found = false;
        for (let propName of propNames) {
            if (propName.startsWith("custom:")) {
                let propDef = this._getCustomPropertyDefinition(propName);
                if ((propDef.propertyName !== 'br') && (propDef.propertyName !== 'm')) {
                    continue;
                }

                let element = this._findElementWithCustomProperty(propDef);
                if (element) {
                    var value = element.props[propDef.propertyName];
                    changes[propName] = value;
                    found = true;
                }
            }
        }

        if (found) {
            this.setProps(changes, mode);
        }
    }

    get stateAnimations() {
        if (this.runtimeProps.stateAnimations) {
            return this.runtimeProps.stateAnimations;
        }

        if (this._artboard) {
            return this._artboard.stateAnimations;
        }
    }

    _changeState(toStateId, fromStateId, animate = true) {
        var newState = this._artboard._recorder.getStateById(toStateId);
        if (newState) {
            var oldStateName = this._artboard._recorder.getStateNameById(fromStateId) || this._artboard._recorder.getDefaultState().name;
            PropertyStateRecorder.applyState(this, newState, oldStateName, animate);

            this.stateChanged.raise(toStateId);
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
        return this.getElementById(this.id + def.controlId);
    }

    private updateCustomProperties(props) {
        for (var propName in props) {
            if (propName.startsWith('custom:')) {
                var prop = this._getCustomPropertyDefinition(propName);
                var element = this._findElementWithCustomProperty(prop);
                if (!element) {
                    //can happen if symbol is restored from json before artboard
                    continue;
                }

                var value = props[propName];
                if (value === undefined) { // custom property was deleted, i.e by undo or reset property action
                    var sourceElement = element === this ? this._artboard : this._artboard.getElementById(element.sourceId());
                    delete this.props[propName];
                    value = sourceElement.props[prop.propertyName];
                }

                if (value && element) {
                    element.prepareAndSetProps({ [prop.propertyName]: value }, ChangeMode.Root);
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
            backgrounds.forEach(x => x.prepareAndSetProps({ fill: this.fill, stroke: this.stroke }, ChangeMode.Self));
        }
    }

    prepareProps(changes, mode?) {
        super.prepareProps(changes, mode);

        if (changes.fill && changes.fill !== this.props.fill) {
            let newName = "self:fill";
            changes["custom:" + newName] = changes.fill;
        }
        if (changes.stroke && changes.stroke !== this.props.stroke) {
            let newName = "self:stroke";
            changes["custom:" + newName] = changes.stroke;
        }

        for (var propName in changes) {
            if (propName.startsWith('custom:')) {
                var prop = this._getCustomPropertyDefinition(propName);
                changes['owt:' + prop.controlId + ':' + prop.propertyName] = true;
            }
        }
    }

    /**
     * For undo to work, the symbol must pretend that it had old custom properties when new ones are set.
     */
    setProps(props, mode = ChangeMode.Model) {
        for (let propName in props) {
            if (propName.startsWith('custom:') && !this.props.hasOwnProperty(propName)) {
                let def = this._getCustomPropertyDefinition(propName);
                let element = this._findElementWithCustomProperty(def);
                if (element) {
                    this.props[propName] = element.props[def.propertyName];
                }
            }
        }

        super.setProps(props, mode);
    }

    getStates() {
        return this._artboard ? this._artboard.getStates() : [];
    }

    get states() {
        return RuntimeProxy.unwrap(this).getStates().map(s => s.name);
    }

    nextState() {
        let that = RuntimeProxy.unwrap(this);
        let states = that.getStates();
        if (!states && !states.length) {
            return false;
        }

        if (!that.props.stateId) {
            that.props.stateId = states[0].id;
        }

        let index = states.findIndex(s => s.id === that.props.stateId);
        if (index < states.length - 1) {
            that.setProps({ stateId: states[index + 1].id });

            return true;
        }

        return false;
    }

    prevState() {
        let that = RuntimeProxy.unwrap(this);
        let states = that.getStates();
        if (!states && !states.length) {
            return false;
        }

        if (!that.props.stateId) {
            that.props.stateId = states[0].id;
        }

        let index = states.findIndex(s => s.id === that.props.stateId);
        if (index > 0) {
            that.setProps({ stateId: states[index - 1].id });
            return true;
        }

        return false;
    }

    get stateId() {
        if (this.props.stateId) {
            return this.props.stateId;
        }

        return 'default';
    }

    get currentState(): string {
        let that = RuntimeProxy.unwrap(this);
        let states = that.getStates();
        if (!states && !states.length) {
            return undefined;
        }

        return states.find(s => s.id === this.stateId).name;
    }

    set currentState(name: string) {
        let that = RuntimeProxy.unwrap(this);
        let states = that.getStates();
        if (!states && !states.length) {
            return;
        }

        let state = states.find(s => s.name === name);
        that.setProps({ stateId: state.id });
    }

    canDrag() {
        let root = this.findNextRoot();
        return !root || root.isEditable();
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
        if (!this.parent || !this.parent.primitiveRoot()) {
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
            path[path.length - 1] = this.id;
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
        if (this.runtimeProps.intUpd) {
            return;
        }

        var nextRoot = this.findNextRoot();

        if (element.id === this.id && nextRoot) {
            nextRoot.registerSetProps(element, props, oldProps, mode);
            return;
        }

        var propNames = Object.keys(props);
        var newSymbolProps = {};
        var oldSymbolProps = null;
        var fillStroke = null;
        var isBackground = element.hasFlags(UIElementFlags.SymbolBackground);

        for (var i = 0; i < propNames.length; ++i) {
            var propName = propNames[i];
            if (propName.startsWith("custom:") || propName === 'br' || propName === 'm') {
                continue;
            }
            var newName = element.sourceId() + ":" + propName;
            var customPropName = "custom:" + newName;

            newSymbolProps[customPropName] = props[propName];
            newSymbolProps["owt:" + newName] = true;
            oldSymbolProps = oldSymbolProps || {};
            oldSymbolProps[customPropName] = oldProps[propName];

            if (isBackground) {
                if (propName === "fill" || propName === "stroke") {
                    fillStroke = fillStroke || {};
                    fillStroke[propName] = props[propName]
                    newSymbolProps[propName] = props[propName];
                    oldSymbolProps[propName] = oldProps[propName];
                }
            }
        }

        this.beginInternalUpdate();

        if (isBackground && fillStroke) {
            this.findBackgrounds().forEach(x => x.setProps(fillStroke, ChangeMode.Self));
        }

        this.setProps(newSymbolProps);
        if (nextRoot) {
            nextRoot.registerSetProps(this, newSymbolProps, oldSymbolProps, mode);
        }

        this.endInternalUpdate();
    }

    registerDelete(parent: Container, element: UIElement, index: number, mode: ChangeMode = ChangeMode.Model) {
        if (mode === ChangeMode.Model && !Symbol.flattening) {
            element.setProps({ visible: false }, mode);
        }
    }

    private beginInternalUpdate() {
        if (!this.runtimeProps.intUpd) {
            this.runtimeProps.intUpd = 0;
        }
        ++this.runtimeProps.intUpd;
    }
    private endInternalUpdate() {
        --this.runtimeProps.intUpd;
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

    fillBackground() {
        if (!this.runtimeProps.hasBg) {
            super.fillBackground.apply(this, arguments);
        }
    }
    strokeBorder() {
        if (!this.runtimeProps.hasBg) {
            super.strokeBorder.apply(this, arguments);
        }
    }

    getNonRepeatableProps(newProps) {
        var result = super.getNonRepeatableProps(newProps);
        result.push("stateId");
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

    registerStateAnimation(from: string, to: string, defaultAnimationOptions: IAnimationOptions, elementOptions?: { [element: string]: { [prop: string]: IAnimationOptions } }) {
        let rp = this.runtimeProps;
        let stateAnimation = rp.stateAnimations = rp.stateAnimations || {};
        let fromState = stateAnimation[from] = stateAnimation[from] || {};
        fromState[to] = {
            defaultOptions: defaultAnimationOptions,
            elementOptions: elementOptions
        };
    }

    dblclick(event: IMouseEventData) {
        var element = this.hitElementDirect(event, event.view);
        if (element !== this) {
            Selection.makeSelection([element]);
        }

        //do not handle for text tool
        event.handled = false;
    }

    attachDisposable(disposable: IDisposable) {
        this.runtimeProps.disposables = this.runtimeProps.disposables || new AutoDisposable();
        this.runtimeProps.disposables.add(disposable)
    }

    flatten() {
        Symbol.flattening = true;
        this.applyVisitor(x => {
            x.removeFlags(UIElementFlags.SymbolBackground | UIElementFlags.SymbolText);
            x.resizeDimensions(ResizeDimension.Both);
        })
        super.flatten();
        Symbol.flattening = false;
    }

    enableGroupLocking() {
        return true;
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
        type: "dropdown",
        options: {
            items: function (selection: ISelection) {
                let symbols = selection.elements.filter(x => x instanceof Symbol) as Symbol[];
                if (!symbols.length) {
                    return [];
                }
                let source = symbols[0].source();
                let states = [];
                if (symbols.every(x => x.props.source.pageId === source.pageId && x.props.source.artboardId === source.artboardId)) {
                    states = symbols[0].getStates();
                }
                return states.map(x => {
                    return {
                        name: x.name,
                        value: x.id
                    }
                });
            }
        }
    },
    overflow: {
        defaultValue: Overflow.Clip
    },
    allowMoveOutChildren: {
        defaultValue: false
    },
    prepareVisibility: function (element: Symbol) {
        return {
            stateId: element._artboard && element._artboard.props
                && element._artboard.props.states
                && element._artboard.props.states.length > 1
        }
    },

    proxyDefinition: function () {
        let baseDefinition = PropertyMetadata.findForType(Container).proxyDefinition();
        return {
            rprops: ["states", "stateAnimations"].concat(baseDefinition.rprops), // readonly props
            props: ["currentState"].concat(baseDefinition.props),
            methods: [
                "nextState",
                "prevState",
                "registerStateAnimation",
                "attachDisposable",
                "setProperties",
                "getPropertiesSnapshot",
                "registerEventHandler",
                "raiseEvent",
                "findElementByName"].concat(baseDefinition.methods),
            mixins: [].concat(baseDefinition.mixins)
        }
    },
    groups() {
        var groups = PropertyMetadata.findForType(Container).groups();
        groups = groups.slice();
        groups.splice(1, 0, {
            label: "@symbol",
            properties: ["stateId"]
        });
        return groups;
    }
})

