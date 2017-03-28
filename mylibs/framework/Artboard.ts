import UIElement from "./UIElement";
import Container from "framework/Container";
import Brush from "framework/Brush";
import PropertyMetadata from "framework/PropertyMetadata";
import Page from "framework/Page";
import * as math from "math/math";
import { isPointInRect } from "math/math";
import SharedColors from "ui/SharedColors";
import { ChangeMode, TileSize, Types, ArtboardResource, PatchType } from "./Defs";
import RelayoutEngine from "./relayout/RelayoutEngine";
import PropertyStateRecorder from "framework/PropertyStateRecorder";
import ModelStateListener from "framework/sync/ModelStateListener";
import Point from "math/point";
import Selection from "framework/SelectionModel";
import Environment from "environment";
import Matrix from "math/matrix";
import DataNode from "framework/DataNode";


//TODO: fix name of artboard on zoom
//TODO: measure artboard rendering time
//TODO: cache artboard to inmemorty canvas

// TODO: artboard states
// 9. Duplicate artboard should duplicate all state boards
// 8. disable duplicate and copy/paste for stateboard
// 12. property override on viewer
// cleanup empty states


class Artboard extends Container {
    constructor(props) {
        super(props);
        this.allowArtboardSelection(false);
        this.selectFromLayersPanel = true;

        this.noDefaultSettings = true;
        this._recorder = new PropertyStateRecorder(this);
        this._recorder.initFromJSON(this.props.states);

        this.runtimeProps.version = 0;
        this.customProperties = [];
        this.runtimeProps.stateBoards = [];
        this._externals = null;
    }

    allowArtboardSelection(value: boolean){
        this.canMultiselectChildren = !value;
        this.multiselectTransparent = !value;

        this.canSelect(value);
        this.canDrag(value);
    }

    canRotate(): boolean{
        return false;
    }

    get frame() {
        if (!this.props.frame) {
            return null;
        }

        if (!this._frame || this._frame.version !== this._frame.runtimeProps.cloneVersion) {
            var page = DataNode.getImmediateChildById(App.Current, this.props.frame.pageId);
            if (page) {
                var frame = DataNode.getImmediateChildById(page, this.props.frame.artboardId, true);

                if (frame.runtimeProps.clone && frame.runtimeProps.cloneVersion === frame.version) {
                    return frame.runtimeProps.clone;
                }

                var screen = frame.findElementByName('screen');
                if (!screen) {
                    this.setProps({ frame: null });
                    return null;
                }

                var frameClone = frame.clone();
                frame.runtimeProps.cloneVersion = frame.version;
                frame.runtimeProps.clone = frameClone;

                frameClone.setProps({ fill: Brush.Empty, stroke: Brush.Empty, m: Matrix.Identity });
                frameClone.applyTranslation({ x: 0, y: 0 }, true);

                var screenRect = screen.getBoundaryRectGlobal();
                var frameRect = frame.getBoundaryRectGlobal();
                frameClone.runtimeProps.frameX = frameRect.x - screenRect.x;
                frameClone.runtimeProps.frameY = frameRect.y - screenRect.y;
                var screenBox = screen.getBoundingBox();
                frameClone.runtimeProps.cloneScreenWidth = screenBox.width;
                frameClone.runtimeProps.cloneScreenHeight = screenBox.height;
                this._frame = frame;
            }
        }

        return this._frame.runtimeProps.clone;
    }

    select() {
        this.allowArtboardSelection(true);
    }

    unselect() {
        this.allowArtboardSelection(false);
    }

    layoutGridSettings(value) {
        if (value !== undefined) {
            this.setProps({ layoutGridSettings: value });
        }
        return this.props.layoutGridSettings;
    }

    headerText() {
        if (this._recorder.statesCount() > 1) {
            return this._recorder.getStateById("default").name;
        }
        return this.props.name;
    }

    minWidth() {
        return 1;
    }

    minHeight() {
        return 1;
    }

    canAccept(elements: UIElement[]) {
        for (let i = 0; i < elements.length; ++i){
            let element = elements[i];
            if (element instanceof Artboard) {
                return false;
            }

            if (this.props.resource === ArtboardResource.Stencil && element.children !== undefined) {
                var can = true;
                var id = this.id();
                element.applyVisitor(e => {
                    if (e.props.source && e.props.source.artboardId === id) {
                        can = false;
                        return false;
                    }
                })

                if (!can) {
                    return false;
                }
            }

            if (element.props.masterId) {
                var root = element.primitiveRoot();
                var stateboards = this.runtimeProps.stateBoards;
                for (var i = 0; i < stateboards.length; ++i) {
                    if (stateboards[i] === root) {
                        return false;
                    }
                }
            }
        }

        return super.canAccept(elements);
    }

    displayName() {
        if (this._recorder.statesCount() > 1) {
            return this.props.name + " (" + this._recorder.getStateById("default").name + ")";
        }
        return super.displayName();
    }

    drawShadowPath(context, environment) {
        if (environment.offscreen) {
            return;
        }

        var scale = environment.view.scale() * environment.view.contextScale;
        var s4 = 4 / scale;
        var bb = this.getBoundingBoxGlobal();
        context.rect(bb.x + bb.width, bb.y + s4, s4, bb.height);
        context.rect(bb.x + s4, bb.y + bb.height, bb.width, s4);
    }

    drawFrameRect(context, environment) {
        if (environment.offscreen) {
            return;
        }
        context.save();
        context.beginPath();
        context.strokeStyle = "#999";
        var scale = environment.view.scale();
        context.lineWidth = 1 / scale;

        var bb = this.getBoundingBoxGlobal();
        context.rect(bb.x - .5 / scale, bb.y - .5 / scale, bb.width + 1 / scale, bb.height + 1 / scale);
        context.stroke();
        context.restore();
    }

    drawCustomFrame(context, environment) {
        var frame = this.frame;

        context.save();
        var pos = this.position();
        context.translate(pos.x + this.frame.runtimeProps.frameX, pos.y + this.frame.runtimeProps.frameY);
        frame.draw(context, environment);
        context.restore();
    }

    drawExtras(context, environment) {
        if (environment.offscreen) {
            return;
        }

        if (this._recorder && this._recorder.statesCount() > 1) {
            this._renderStatesFrame(context, environment);
        }

        this._renderHeader(context);
    }

    _renderHeader(context) {
        var scale = Environment.view.scale();
        if(scale < .3) {
            return; // do not render name if artboard is too small
        }

        context.save();
        context.beginPath();

        this.viewMatrix().applyToContext(context);
        if (this._active) {
            context.fillStyle = SharedColors.ArtboardActiveText;
        } else {
            context.fillStyle = SharedColors.ArtboardText;
        }
        scale = Math.max(1, scale);
        context.font = (0 | (10 / scale)) + "px Lato, LatoLight, Arial, Helvetica, sans-serif";
        context.rect(0, -16 / scale, this.width(), 16 / scale);
        context.clip();

        context.beginPath();
        context.fillText(this.headerText(), 0, -5 / scale);

        context.restore();
    };

    _renderStatesFrame(context, environment) {
        var stateboards = this.runtimeProps.stateBoards;
        if (!stateboards || !stateboards.length) {
            return;
        }

        context.save();
        context.beginPath();

        var stateboards = this.runtimeProps.stateBoards;
        var states = this.props.states;
        if (states.length !== 0 && stateboards.length !== states.length - 1) {
            //can happen if artboard is drawn prior to stateboards linked themselves
            stateboards = this._linkRelatedStateBoards();
        }

        var rect = this.getBoundaryRectGlobal();
        for (var i = 0; i < stateboards.length; ++i) {
            rect = math.combineRects(rect, stateboards[i].getBoundaryRectGlobal());
        }

        var scale = environment.view.scale();
        var d = Math.max(1, scale);
        var x = rect.x - 20 / d;
        rect.width += 40 / d;
        var y = rect.y - 30 / d;
        rect.height += 50 / d;

        var dw = 10 / d;

        context.beginPath();
        context.moveTo(x + dw, y);
        context.lineTo(x, y);
        context.lineTo(x, y + rect.height);
        context.lineTo(x+dw, y + rect.height)

        context.moveTo(x + rect.width - dw, y);
        context.lineTo(x + rect.width, y);
        context.lineTo(x + rect.width, y + rect.height);
        context.lineTo(x + rect.width - dw, y + rect.height)
       // context.rect(x, y, rect.width, rect.height);
        context.strokeStyle = SharedColors.ArtboardText;
        context.lineWidth = 1 / scale;
        context.stroke();

        if(scale >= 0.5) {
            context.font = (0 | (10 / scale)) + "px Lato, LatoLight, Arial, Helvetica, sans-serif";
            context.beginPath();
            context.rectPath(x, y - 20 / scale, Math.max(150, this.width()), 20 / scale);
            context.clip();

            context.fillStyle = SharedColors.ArtboardText;

            context.fillText(this.props.name, x, y - 5 / scale);
        }

        context.restore();
    };

    clone() {
        var clone = super.clone.apply(this, arguments);
        if (this._recorder) {
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
        context.save();
        var frame = this.frame;
        if (frame && environment.showFrames) {
            context.beginPath();
            var pos = this.position();
            context.rect(pos.x, pos.y, frame.runtimeProps.cloneScreenWidth, frame.runtimeProps.cloneScreenHeight);
            context.clip();
        }
        super.drawSelf(context, w, h, environment);
        this.onContentDrawn && this.onContentDrawn(this, context);
        context.restore();
    }

    clipSelf() {
        return true;
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
            res['custom:' + prop.controlId + ':' + prop.propertyName] = propMetadata;
        }

        res['groups'] = function () {
            return [
                {
                    label: "Layout",
                    properties: ["width", "height", "x", "y", "angle"]
                },
                {
                    label: element.name(),
                    properties: ['stateId'].concat(properties.map(p => {
                        return 'custom:' + p.controlId + ':' + p.propertyName
                    }))
                },
                // {
                //     label: "Actions",
                //     properties: ["actions"]
                // },
                {
                    label: "@constraints",
                    properties: ["constraints"]
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

        if (oldProps.name !== undefined) {
            PropertyMetadata.removeNamedType('user:' + oldProps.name)
        }

        if (props.customProperties !== undefined ||
            props.states !== undefined
            || props.name !== undefined) {
            this._refreshMetadata();
        }

        if (props.resource !== undefined && Selection.isOnlyElementSelected(this)) {
            Selection.refreshSelection();
            if (props.resource === ArtboardResource.Stencil) {
                this.runtimeProps.refreshToolbox = true;
            } else if (oldProps.resource === ArtboardResource.Stencil) {
                var parent = this.parent();
                if (parent) {
                    parent.makeToolboxConfigDirty(true);
                }
            }

        }

        if (props.frame === null) {
            delete this._frame;
        }
    }

    hitTest(point, scale) {
        var res = super.hitTest(point, scale);
        if (res) {
            return res;
        }
        if (this.hasBadTransform()){
            return false;
        }
        var bb = this.getBoundingBoxGlobal();
        return isPointInRect({ x: bb.x, y: bb.y - 20 / scale, width: bb.width, height: 20 / scale }, point);
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

    getCustomProperties(value) {
        if (arguments.length > 0) {
            this.setProps({ customProperties: value });
        }
        return this.props.customProperties;
    }

    getChildControlList() {
        var res = [];
        this.applyVisitor(e => {
            if (e !== this) {
                res.push(e);
            }
        })

        res.sort((e1, e2) => {
            return e1.displayName() > e2.displayName();
        })

        return res;
    }

    relayoutCompleted() {
        this.runtimeProps.version++;
        var parent = this.parent();
        if (parent) {
            parent.incrementVersion();
            if (this.props.resource === ArtboardResource.Stencil) {
                parent.makeToolboxConfigDirty(this.runtimeProps.refreshToolbox, this.id());
                delete this.runtimeProps.refreshToolbox;
            }

            if (this.props.resource != undefined) {
                App.Current.resourceChanged.raise(this.props.resource, this);
            }
        }
    }

    get version() {
        return this.runtimeProps.version;
    }

    click(event) {
        var scale = Environment.view.scale();
        var pos = this.position();
        if (isPointInRect({ x: pos.x, y: pos.y - 20 / scale, width: this.width(), height: 20 / scale }, {
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
        return RelayoutEngine.run(this, oldPropsMap);
    }

    getStates() {
        return this._recorder.getStates();
    }

    state(value) {
        if (value !== undefined) {
            this.setProps({ state: value });
        }
        return this.props.state;
    }

    addState(name) {
        return this._recorder.addState(name);
    }

    _refreshMetadata() {
        if (!this._recorder) {
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
        if (this.props.states.length !== 0) {
            this._recorder.trackSetProps("default", element.id(), props, oldProps);
        }

        // TODO: move it to stateBoard controller class
        var stateBoards = this.runtimeProps.stateBoards;
        for (var i = 0; i < stateBoards.length; ++i) {
            var stateBoard = stateBoards[i];
            var transferProps = {};
            var hasAnyProps = false;
            for (var propName in props) {
                if (element === this && (propName == 'm' || propName === 'customProperties' || propName === 'state' || propName === "states" || propName === "actions" || propName === "resource" || propName === "tileSize" || propName === "insertAsContent")) {
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

    propsPatched(patchType, propName, item) {
        super.propsPatched(patchType, propName, item);

        if (propName === 'states' && patchType === PatchType.Remove) {
            var stateBoards = this.runtimeProps.stateBoards;
            for (var i = 0; i < stateBoards.length; ++i) {
                var stateBoard = stateBoards[i];
                if (stateBoard.stateId == item.id) {
                    stateBoard.parent().remove(stateBoard);
                    break;
                }
            }
        }
    }

    registerInsert(parent, element, index, mode) {
        super.registerInsert(parent, element, index, mode);
        if (this.props.states.length !== 0) {
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

        parent.setActiveArtboard(null);
    }

    registerDelete(parent, element, index, mode) {
        super.registerDelete(parent, element, index, mode);
        if (this.props.states.length !== 0) {
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
        if (this.props.states.length !== 0) {
            this._recorder.trackChangePosition(parent, element.id(), index, oldIndex);
        }

        // TODO: move it to stateBoard controller class
        var stateBoards = this.runtimeProps.stateBoards;
        for (var i = 0; i < stateBoards.length; ++i) {
            var stateBoard = stateBoards[i];
            stateBoard.transferChangePosition(element, index);
        }
    }

    fromJSON() {
        super.fromJSON.apply(this, arguments);
        if (this._recorder) {
            this._recorder.initFromJSON(this.props.states);
        }
    }

    getRecorder() {
        return this._recorder;
    }

    linkNewStateBoard(stateBoard) {
        var margin = 40;
        var box = this.getBoundingBox();
        var width = box.width;
        var height = box.height;
        var statesCount = this._recorder.statesCount();

        stateBoard.setProps({
            masterId: this.id(),
            width: width,
            height: height,
            name: this.props.name
        }, ChangeMode.Self);
        stateBoard.applyTranslation(new Point(box.x, box.y + (statesCount - 1) * (height + margin)), false, ChangeMode.Self);

        for (var i = 0; i < this.children.length; i++) {
            var e = this.children[i];
            var clone = e.clone();
            clone.setProps({ masterId: e.id() }, ChangeMode.Self);
            stateBoard.add(clone, ChangeMode.Root);
        }

        this.linkStateBoard(stateBoard);
    }

    linkStateBoard(stateBoard) {
        stateBoard.artboard = this;

        if (!stateBoard.parent() || stateBoard.parent() === NullContainer) {
            this.parent().add(stateBoard);
        }
        this.runtimeProps.stateBoards.push(stateBoard);
    }

    _linkRelatedStateBoards() {
        var id = this.id();
        var stateBoards = this.runtimeProps.stateBoards;
        var missingLinks = this.props.states.filter(x => x.id !== "default" && !stateBoards.some(y => x.id === y.props.stateId));
        for (var i = 0; i < missingLinks.length; i++) {
            var stateId = missingLinks[i].id;
            var stateBoard = this.parent().findNodeBreadthFirst(x => x.props.masterId === id && x.props.stateId === stateId);
            this.linkStateBoard(stateBoard);
        }
        return stateBoards;
    }

    replaceAction(oldAction, newAction) {
        var index = this.props.actions.findIndex(a => a === oldAction);
        if (index >= 0) {
            var newActions = this.props.actions.slice();
            newActions.splice(index, 1, newAction);
            this.setProps({ actions: newActions });
        }
    }
}
Artboard.prototype.t = Types.Artboard;

var fwk = sketch.framework;
PropertyMetadata.registerForType(Artboard, {
    fill: {
        defaultValue: Brush.White,
        options: {
            size: 1 / 4
        }
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
    guidesX: {
        defaultValue: []
    },
    guidesY: {
        defaultValue: []
    },
    resource: {
        displayName: "@resource",
        type: "dropdown",
        defaultValue: null,
        options: {
            items: [
                { name: "Regular", value: null },
                { name: "Stencil", value: ArtboardResource.Stencil },
                { name: "Template", value: ArtboardResource.Template },
                { name: "Frame", value: ArtboardResource.Frame },
                { name: "Palette", value: ArtboardResource.Palette },
            ]
        }
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
        defaultValue: TileSize.Small
    },
    insertAsContent: {
        displayName: "@ascontent",
        type: 'checkbox',
        defaultValue: false
    },
    toolboxGroup: {
        displayName: "@groupname",
        type: 'text',
        defaultValue: 'Custom'
    },
    frame: {
        displayName: "@frame",
        type: "frame",
        defaultValue: null,
        options: {
            size: 3 / 4
        }
    },
    prepareVisibility(props) {
        var showAsStencil = props.resource === ArtboardResource.Stencil;
        return {
            tileSize: showAsStencil,
            insertAsContent: showAsStencil,
            toolboxGroup: showAsStencil,
            allowVerticalResize: showAsStencil,
            allowHorizontalResize: showAsStencil
        }
    },
    groups: function () {
        return [
            {
                label: "Layout",
                properties: ["width", "height", "x", "y"],
                expanded: true
            },
            {
                label: "Appearance",
                expanded: false,
                properties: ["fill", "frame"]
            },
            {
                label: "States",
                properties: ["states"],
                expanded: true
            },
            {
                label: "@advanced",
                properties: ["resource", "allowHorizontalResize", "allowVerticalResize", "tileSize", "insertAsContent", "toolboxGroup"],
                expanded: true
            }
            // ,{
            //     label: "Custom properties",
            //     properties: ["customProperties"]
            // }
        ];
    }
});


export default Artboard;