import Container from "framework/Container";
import Brush from "framework/Brush";
import PropertyMetadata from "framework/PropertyMetadata";
import Page from "framework/Page";
import {isPointInRect} from "math/math";
import SharedColors from "ui/SharedColors";
import {ChangeMode, TileSize, Types} from "./Defs";
import RelayoutEngine from "./relayout/RelayoutEngine";
import PropertyStateRecorder from "framework/PropertyStateRecorder";
import ModelStateListener from "framework/sync/ModelStateListener";
import * as math from "math/math";
import Selection from "framework/SelectionModel";
import ActionHelper from "ui/prototyping/ActionHelper";
import Environment from "environment";


//TODO: fix name of artboard on zoom
//TODO: measure artboard rendering time
//TODO: cache artboard to inmemorty canvas

// TODO: artboard states
// 9. Duplicate artboard should duplicate all state boards
// 8. disable duplicate and copy/paste for stateboard
// 12. property override on viewer
// delete state
// rename state
// cleanup empty states


class Artboard extends Container {
    constructor(props) {
        super(props);
        this.clipSelf(true);
        this.fill(Brush.White);
        this._dragable(true);
        this.selectFromLayersPanel = true;

        this._angleEditable = false;
        this.noDefaultSettings = true;
        this._recorder = new PropertyStateRecorder(this);
        this._recorder.initFromJSON(this.props.states);

        if (App.Current.activePage && App.Current.activePage.getNextArtboardName) {
            this.name(App.Current.activePage.getNextArtboardName());
        } else {
            this.name("Artboard"); // TODO: get it from label
        }

        this.runtimeProps.version = 0;
        this.customProperties = [];
        this.runtimeProps.stateBoards = [];
        this._externals = null;
    }

    _dragable(value) {
        this.canMultiselectChildren = !value;
        this.multiselectTransparent = !value;
        this.canSelect(value);
        this.canDrag(value);
    }

    select() {
        this._dragable(true);
    }

    unselect() {
        if (this.children.length) {
            this._dragable(false);
        }
    }

    acquiringChild(child) {
        super.acquiringChild(child);
        this._dragable(false);
    }

    releasingChild(child) {
        super.releasingChild(child);
        if (this.children.length < 2) {
            this._dragable(true);
        }
    }

    layoutGridSettings(value) {
        if (value !== undefined) {
            this.setProps({layoutGridSettings: value});
        }
        return this.props.layoutGridSettings;
    }

    headerText() {
        if (this._recorder.statesCount() > 1) {
            return this._recorder.getStateById("default").name;
        }
        return this.props.name;
    }

    canAccept(element){
        if(element instanceof Artboard){
            return false;
        }

        if(element.props.masterId){
            var root = element.primitiveRoot();
            var stateboards = this.runtimeProps.stateBoards;
            for(var i = 0; i < stateboards.length; ++i){
                if(stateboards[i] === root){
                    return false;
                }
            }
        }

        return super.canAccept(element);
    }

    displayName(){
        if (this._recorder.statesCount() > 1) {
            return this.props.name + " (" + this._recorder.getStateById("default").name + ")";
        }
        return super.displayName();
    }

    _drawShadow(context, environment) {
        if(environment.offscreen){
            return;
        }
        context.save();
        context.fillStyle = "#9EA2a6";
        context.beginPath();
        var scale = environment.view.scale() *environment.view.contextScale;
        var s4 = 4/scale;
        context.rect(this.x() + this.width(), this.y()+s4, s4, this.height());
        context.rect(this.x() + s4, this.y()+this.height(), this.width(), s4);
        context.fill();
        context.restore();
    }

    draw(context, environment) {
        this._drawShadow(context, environment);

        super.draw(context, environment);

        if(environment.offscreen){
            return;
        }

        if (this._recorder && this._recorder.statesCount() > 1) {
            this._renderStatesFrame(context);
        }

        this._renderHeader(context);
    }

    _renderHeader(context) {
        context.save();
        context.beginPath();

        var scale = Environment.view.scale();
        this.viewMatrix().applyToContext(context);
        if (this._active) {
            context.fillStyle = SharedColors.ArtboardActiveText;
        } else {
            context.fillStyle = SharedColors.ArtboardText;
        }
        context.font = (0 | (10 / scale)) + "px Lato, LatoLight, Arial, Helvetica, sans-serif";
        context.rect(0, -16 / scale, this.width(), 16 / scale);
        context.clip();

        context.fillText(this.headerText(), 0, -5 / scale);

        context.restore();
    };

    _renderStatesFrame(context) {
        var stateboards = this.runtimeProps.stateBoards;
        if(!stateboards || !stateboards.length){
            return;
        }

        context.save();
        context.beginPath();

        var stateboards = this.runtimeProps.stateBoards;
        var states = this.props.states;
        if (states.length !== 0 && stateboards.length !== states.length - 1){
            //can happen if artboard is drawn prior to stateboards linked themselves
            stateboards = this._linkRelatedStateBoards();
        }

        var rect = this.getBoundaryRectGlobal();
        for (var i = 0; i < stateboards.length; ++i) {
            rect = math.combineRects(rect, stateboards[i].getBoundaryRectGlobal());
        }

        var scale = Environment.view.scale();
        var x = rect.x - 20 / scale;
        rect.width += 40 / scale;
        var y = rect.y - 30 / scale;
        rect.height += 50 / scale;

        context.rect(x, y, rect.width, rect.height);
        context.strokeStyle = SharedColors.ArtboardText;
        context.stroke();

        context.font = (0 | (12 / scale)) + "px Lato, LatoLight, Arial, Helvetica, sans-serif";
        context.rectPath(x, y - 20 / scale, this.width(), 20 / scale);
        context.clip();

        context.fillStyle = SharedColors.ArtboardText;

        context.fillText(this.props.name, x, y - 5 / scale);

        context.restore();
    };

    clone() {
        var clone = super.clone.apply(this, arguments);
        if(this._recorder) {
            clone._recorder.initFromJSON(this.props.states.map(x => extend(true, {}, x)));
            clone._recorder.changeState(this.state());
        }
        return clone;
    }

    activate() {
        this._active = true;
        this._recorder && this._recorder.record();
    }

    deactivate() {
        this._active = false;
        this.resetGlobalViewCache();
        this._recorder && this._recorder.stop();
    }

    fillBackground(context, l, t, w, h) {
        super.fillBackground(context, l, t, w, h);
        this.onBackgroundDrawn && this.onBackgroundDrawn(this, context);
    }

    drawSelf(context, w, h, environment) {
        super.drawSelf(context, w, h, environment);
        this.onContentDrawn && this.onContentDrawn(this, context);
    }

    buildMetadata(properties) {
        var element = this;
        var res = {};

        var childrenMap = {};
        for (var i = 0; i < properties.length; ++i) {
            var prop = properties[i];
            var child = childrenMap[prop.controlId];
            if (!child) {
                child = this.getElementById(prop.controlId);
                childrenMap[prop.controlId] = child;
            }
            var propMetadata = PropertyMetadata.find(child.t, prop.propertyName);
            res['custom:' + prop.propertyName] = propMetadata;
        }

        res['groups'] = function () {
            return [
                {
                    label: element.name(),
                    properties: ['stateId'].concat(properties.map(p=> {
                        return 'custom:' + p.propertyName
                    }))
                },
                {
                    label: "Actions",
                    properties: ["actions"]
                },
                {
                    label: "Appearance",
                    properties: ["visible"]
                },
                {
                    label: "Layout",
                    properties: ["width", "height", "x", "y", "anchor", "angle", "dockStyle", "horizontalAlignment", "verticalAlignment"]
                },
                {
                    label: "Margin",
                    properties: ["margin"]
                }
            ];
        }

        return res;
    }

    propsUpdated(props, oldProps) {
        super.propsUpdated.apply(this, arguments);
        if (props.state !== undefined) {
            if (this._recorder && this._recorder.hasState(props.state)) {
                this._recorder.changeState(props.state);
            }
        }
        
        if(oldProps.name !== undefined) {
            PropertyMetadata.removeNamedType('user:' + oldProps.name)
        }

        if(props.customProperties !== undefined ||
            props.states !== undefined
        || props.name !== undefined) {
            this._refreshMetadata();
        }

        if(props.showInToolbox !== undefined && Selection.isOnlyElementSelected(this)){

            Selection.refreshSelection();
        }
    }

    hitTest(point, scale) {
        var res = super.hitTest(point, scale);
        if (res) {
            return res;
        }
        return isPointInRect({x: this.x(), y: this.y() - 20 / scale, width: this.width(), height: 20 / scale}, point);
    }

    primitiveRoot() {
        if (!this.parent() || !this.parent().primitiveRoot()) {
            return null;
        }
        return this;
    }
    primitivePath(){
        var parent = this.parent();
        if (!parent || !parent.primitiveRoot()) {
            return null;
        }
        var path = this.runtimeProps.primitivePath;
        if (!path){
            path = parent.primitivePath().slice();
            path[path.length - 1] = this.id();
            path.push(this.id());
            this.runtimeProps.primitivePath = path;
        }
        return path;
    }
    primitiveRootKey(){
        var parent = this.parent();
        if (!parent || !parent.primitiveRoot()) {
            return null;
        }
        var s = this.runtimeProps.primitiveRootKey;
        if (!s){
            s = parent.id() + this.id();
            this.runtimeProps.primitiveRootKey = s;
        }
        return s;
    }

    getCustomProperties(value) {
        if (arguments.length > 0) {
            this.setProps({customProperties: value});
        }
        return this.props.customProperties;
    }

    getChildControlList() {
        var res = [];
        this.applyVisitor(e=> {
            if (e !== this) {
                res.push(e);
            }
        })

        res.sort((e1, e2)=> {
            return e1.displayName() > e2.displayName();
        })

        return res;
    }

    relayoutCompleted() {
        this.runtimeProps.version++;
        var parent = this.parent();
        if(parent){
            parent.incrementVersion();
            if(this.props.showInToolbox){
                parent.makeToolboxConfigDirty();
            }
        }
    }

    get version(){
        return this.runtimeProps.version;
    }

    click(event) {
        var scale = Environment.view.scale();
        if (isPointInRect({x: this.x(), y: this.y() - 20 / scale, width: this.width(), height: 20 / scale}, {
                x: event.x,
                y: event.y
            })) {
            Selection.makeSelection([this]);
            event.handled = true;
        }
    }

    canBeAccepted(container) {
        return container instanceof Page;
    }

    //autoInsert(element) {
    //    if (typeof element.orientation === 'function') {
    //        element.orientation(this.orientation());
    //    }
    //
    //    return Page.prototype.autoInsert.apply(this, arguments);
    //}

    relayout(oldPropsMap) {
        return RelayoutEngine.run2(this, oldPropsMap);
    }

    getStates() {
        return this._recorder.getStates();
    }

    state(value) {
        if (value !== undefined) {
            this.setProps({state: value});
        }
        return this.props.state;
    }

    addState(name) {
        return this._recorder.addState(name);
    }

    _refreshMetadata(){
        if(!this._recorder){
            return;
        }
        var ArtboardTemplateControl = PropertyMetadata.findAll(Types.ArtboardTemplateControl)._class;
        PropertyMetadata.replaceForNamedType('user:' + this.name(), ArtboardTemplateControl, this.buildMetadata(this.props.customProperties));
    }

    duplicateState(name, newName) {
        this._recorder.duplicateState(name, newName);
    }

    removeState(name) {
        this._recorder.removeState(name);
    }

    registerSetProps(element, props, oldProps, mode) {
        super.registerSetProps(element, props, oldProps, mode);
        if (this.props.states.length !== 0){
            this._recorder.trackSetProps("default", element.id(), props, oldProps);
        }

        // TODO: move it to stateBoard controller class
        var stateBoards = this.runtimeProps.stateBoards;
        for (var i = 0; i < stateBoards.length; ++i) {
            var stateBoard = stateBoards[i];
            var transferProps = {};
            var hasAnyProps = false;
            for (var propName in props) {
                if(element === this && (propName === 'x' || propName == 'y' )){
                    continue;
                }
                if (propName === 'customProperties' || propName === 'state' || propName === "states" || propName === "actions" || propName === "showInToolbox" || propName === "tileSize" || propName === "insertAsContent") {
                    continue;
                }
                if (!this._recorder.hasStatePropValue(stateBoard.stateId, element.id(), propName)) {
                    transferProps[propName] = props[propName];
                    hasAnyProps = true;
                }
            }
            if (hasAnyProps) {
                stateBoard.transferProps(element.id(), transferProps);
            }
        }
    }

    registerInsert(parent, element, index, mode) {
        super.registerInsert(parent, element, index, mode);
        if (this.props.states.length !== 0){
            this._recorder.trackInsert(parent, element, index);
        }

        // TODO: move it to stateBoard controller class
        var stateBoards = this.runtimeProps.stateBoards;
        for (var i = 0; i < stateBoards.length; ++i) {
            var stateBoard = stateBoards[i];
            stateBoard.transferInsert(parent, element, index);
        }
    }

    transferInsert(fromStateId, parentId, element, index) {
        var parent = this.getElementById(parentId);
        parent.insert(element, index, ChangeMode.Root);
        ModelStateListener.trackInsert(this, parent, element, index);
        this._recorder.trackInsert(element.id());

        // TODO: move it to stateBoard controller class
        var stateBoards = this.runtimeProps.stateBoards;
        for (var i = 0; i < stateBoards.length; ++i) {
            var stateBoard = stateBoards[i];
            if (stateBoard.stateId !== fromStateId) {
                stateBoard.transferInsert(parent, element, index);
            }
        }
    }

    trackInserted() {
        delete this.runtimeProps.primitivePath;
        delete this.runtimeProps.primitiveRootKey;

        super.trackInserted.apply(this, arguments);
    }
    // this on is called when somebody is deleting artboard
    trackDeleted(parent) {
        delete this.runtimeProps.primitivePath;
        delete this.runtimeProps.primitiveRootKey;

        // TODO: move it to stateBoard controller class
        var stateBoards = this.runtimeProps.stateBoards;
        for (var i = 0; i < stateBoards.length; ++i) {
            var stateBoard = stateBoards[i];
            stateBoard.parent().remove(stateBoard);
        }

        super.trackDeleted.apply(this, arguments);
    }

    registerDelete(parent, element, index, mode) {
        super.registerDelete(parent, element, index, mode);
        if (this.props.states.length !== 0){
            this._recorder.trackDelete(parent, element.id());
        }

        // TODO: move it to stateBoard controller class
        var stateBoards = this.runtimeProps.stateBoards;
        for (var i = 0; i < stateBoards.length; ++i) {
            var stateBoard = stateBoards[i];
            stateBoard.transferDelete(element);
        }
    }

    removeStateById(stateId) {
        this._recorder.removeStateById(stateId);
        var stateBoards = this.runtimeProps.stateBoards;
        for (var i = 0; i < stateBoards.length; ++i) {
            if (stateBoards[i].props.stateId === stateId) {
                stateBoards.splice(i, 1);
                break;
            }
        }
    }

    registerChangePosition(parent, element, index, oldIndex) {
        super.registerChangePosition(parent, element, index, oldIndex);
        if (this.props.states.length !== 0){
            this._recorder.trackChangePosition(parent, element.id(), index, oldIndex);
        }

        // TODO: move it to stateBoard controller class
        var stateBoards = this.runtimeProps.stateBoards;
        for (var i = 0; i < stateBoards.length; ++i) {
            var stateBoard = stateBoards[i];
            stateBoard.transferChangePosition(element, index);
        }
    }

    fromJSON(){
        super.fromJSON.apply(this, arguments);
        if (this._recorder){
            this._recorder.initFromJSON(this.props.states);
        }
    }

    getRecorder(){
        return this._recorder;
    }

    linkNewStateBoard(stateBoard) {
        var margin = 40;
        var width = this.width();
        var height = this.height();
        var statesCount = this._recorder.statesCount();

        stateBoard.setProps({
            masterId: this.id(),
            width: width,
            height: this.height(),
            y: this.y() + (statesCount - 1) * (height + margin),
            x: this.x(),
            name: this.props.name
        }, true);

        for (var i = 0; i < this.children.length; i++){
            var e = this.children[i];
            var clone = e.clone();
            clone.setProps({masterId: e.id()}, ChangeMode.Self);
            stateBoard.add(clone, ChangeMode.Root);
        }

        this.linkStateBoard(stateBoard);
    }
    linkStateBoard(stateBoard) {
        stateBoard.artboard = this;

        if(!stateBoard.parent() || stateBoard.parent() === NullContainer) {
            this.parent().add(stateBoard);
        }
        this.runtimeProps.stateBoards.push(stateBoard);
    }
    _linkRelatedStateBoards(){
        var id = this.id();
        var stateBoards = this.runtimeProps.stateBoards;
        var missingLinks = this.props.states.filter(x => x.id !== "default" && !stateBoards.some(y => x.id === y.props.stateId));
        for (var i = 0; i < missingLinks.length; i++){
            var stateId = missingLinks[i].id;
            var stateBoard = this.parent().findNodeBreadthFirst(x => x.props.masterId === id && x.props.stateId === stateId);
            this.linkStateBoard(stateBoard);
        }
        return stateBoards;
    }

    replaceAction(oldAction, newAction){
        var index = this.props.actions.findIndex(a=>a===oldAction);
        if(index >= 0){
            var newActions = this.props.actions.slice();
            newActions.splice(index, 1, newAction);
            this.setProps({actions:newActions});
        }
    }
}
Artboard.prototype.t = Types.Artboard;

var fwk = sketch.framework;
PropertyMetadata.registerForType(Artboard, {
    fill: {
        defaultValue: Brush.White
    },
    masterPageId: {
        displayName: "Master page",
        type: "pageLink",  //masterPageEditorOptions
    },
    screenType: {
        displayName: "Device",
        type: "choice",
        possibleValues: fwk.devicesLookupValues,
        useInModel: true
    },
    "layoutGridSettings": {
        defaultValue: null
    },
    showInToolbox: {
        displayName: "Show in toolbox",
        type: "checkbox",
        useInModel: true
    },
    allowHorizontalResize: {
        displayName: "Allow horizontal resize",
        type: "checkbox",
        useInModel: true
    },
    allowVerticalResize: {
        displayName: "Allow vertical resize",
        type: "checkbox",
        useInModel: true
    },
    states: {
        displayName: "States",
        type: "states",
        defaultValue: []
    },
    customProperties: {
        displayName: "Custom properties",
        type: "customProperties",
        useInModel: true,
        defaultValue: []
    },
    tileSize: {
        displayName: "@tilesize",
        type: "tileSize",
        defaultValue:TileSize.Small
    },
    insertAsContent: {
        displayName: "@ascontent",
        type:'checkbox',
        defaultValue:false
    },
    toolboxGroup: {
        displayName: "@groupname",
        type:'text',
        defaultValue:'Custom'
    },
    prepareVisibility(props){
        return {
            tileSize: props.showInToolbox,
            insertAsContent: props.showInToolbox,
            toolboxGroup: props.showInToolbox
        }
    },
    groups: function () {
        return [
            {
                label: "Appearance",
                expanded: false,
                properties: ["visible", "fill"]
            },
            {
                label: "Layout",
                properties: ["width", "height", "x", "y"],
                expanded: true
            },
            {
                label: "States",
                properties: ["states"],
                expanded: true
            },
            {
                label: "User stencils",
                properties: ["showInToolbox", "allowHorizontalResize", "allowVerticalResize", "tileSize", "insertAsContent", "toolboxGroup"],
                expanded: true
            },
            {
                label: "Custom properties",
                properties: ["customProperties"]
            }
        ];
    }
});


export default Artboard;
