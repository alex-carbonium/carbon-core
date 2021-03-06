import UIElement from "./UIElement";
import Container from "./Container";
import Brush from "./Brush";
import PropertyMetadata from "./PropertyMetadata";
import Page from "./Page";
import * as math from "../math/math";
import { isPointInRect, areRectsIntersecting } from "../math/math";
import SharedColors from "../ui/SharedColors";
import { Types } from "./Defs";
import RelayoutEngine from "./relayout/RelayoutEngine";
import PropertyStateRecorder from "./PropertyStateRecorder";
import ModelStateListener from "./relayout/ModelStateListener";
import Point from "../math/point";
import Selection from "./SelectionModel";
import NullContainer from "./NullContainer";
import Matrix from "../math/matrix";
import params from "../params";
import DataNode from "./DataNode";
import { ChangeMode, PatchType, IPrimitiveRoot, LayerType, ILayer, ArtboardType, IIsolatable, IArtboard, IArtboardProps, ISymbol, IRect, TileSize, IPage, IArtboardPage, IUIElement, IContext, IContainer, WorkspaceTool, IMouseEventData, RenderEnvironment, RenderFlags, UIElementFlags, ProxyDefinition, IAnimationOptions, IView, ICoordinate, IRectData } from "carbon-core";
import { measureText } from "./text/MeasureTextCache";
import Rect from "../math/rect";
import CoreIntl from "../CoreIntl";
import { createUUID } from "../util";
import Canvas from "../ui/common/Canvas";
import { IconsetCell } from "./IconsetCell";
import PropertyTracker from "./PropertyTracker";
import { IElementWithCode } from "carbon-model";
import { ArtboardProxyGenerator } from "../code/ProxyGenerator";
import { IDisposable } from "carbon-runtime";
import { AutoDisposable } from "../AutoDisposable";
import EventHelper from "./EventHelper";
import IsolationContext from "../IsolationContext";


// TODO: artboard states
// 9. Duplicate artboard should duplicate all state boards
// 8. disable duplicate and copy/paste for stateboard
// 12. property override on viewer
// cleanup empty states

const IconCellsMargin = 1;
class Artboard extends Container<IArtboardProps> implements IArtboard, IPrimitiveRoot, IIsolatable, IElementWithCode {
    constructor() {
        super();
        this.allowArtboardSelection(false);
        this.runtimeProps.selectFromLayersPanel = true;

        this.noDefaultSettings = true;
        this._recorder = new PropertyStateRecorder(this);
        this._recorder.initFromJSON(this.props.states);

        this.runtimeProps.version = 0;
        this.runtimeProps.codeVersion = 0;
        this.customProperties = [];
        this.runtimeProps.stateBoards = [];

        this.stateChanged = EventHelper.createEvent();

        this._externals = null;
        this.canSelect(false);
        this.canDrag(false);
    }

    allowArtboardSelection(value: boolean) {
        this.canMultiselectChildren = !value;
        this.multiselectTransparent = !value;
        return value;
    }

    canRotate(): boolean {
        return false;
    }

    get frame() {
        if (!this.props.frame) {
            return null;
        }

        if (!this._frame || this._frame.version !== this._frame.runtimeProps.cloneVersion) {
            let page = DataNode.getImmediateChildById(App.Current, this.props.frame.pageId);
            if (page) {
                let frame = DataNode.getImmediateChildById(page, this.props.frame.artboardId, true);

                if (frame.runtimeProps.clone && frame.runtimeProps.cloneVersion === frame.version) {
                    return frame.runtimeProps.clone;
                }

                let screen = frame.findElementByName('screen');
                if (!screen) {
                    this.setProps({ frame: null });
                    return null;
                }

                let frameClone = frame.clone();
                frame.runtimeProps.cloneVersion = frame.version;
                frame.runtimeProps.clone = frameClone;

                frameClone.setProps({ fill: Brush.Empty, stroke: Brush.Empty, m: Matrix.Identity });
                frameClone.applyTranslation({ x: 0, y: 0 }, true);

                let screenRect = screen.getBoundaryRectGlobal();
                let frameRect = frame.getBoundaryRectGlobal();
                frameClone.runtimeProps.frameX = frameRect.x - screenRect.x;
                frameClone.runtimeProps.frameY = frameRect.y - screenRect.y;
                let screenBox = screen.getBoundingBox();
                frameClone.runtimeProps.cloneScreenWidth = screenBox.width;
                frameClone.runtimeProps.cloneScreenHeight = screenBox.height;
                this._frame = frame;
            }
        }

        return this._frame.runtimeProps.clone;
    }

    screenSize() {
        let frame = this.frame;
        if (frame) {
            return { width: frame.runtimeProps.cloneScreenWidth, height: frame.runtimeProps.cloneScreenHeight }
        }

        return { width: this.width, height: this.height };
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
        return super.minWidth() || 1;
    }

    minHeight() {
        return super.minHeight() || 1;
    }

    resizeDimensions(value?) {
        if (this.props.type === ArtboardType.IconSet) {
            return 0;
        }

        return super.resizeDimensions(value);
    }

    getStateboardById(artboardId) {
        if (this.id === artboardId) {
            return this;
        }

        if (this.runtimeProps.stateBoards) {
            for (var sb of this.runtimeProps.stateBoards) {
                if (sb.id === artboardId) {
                    return sb;
                }
            }
        }
    }

    canAccept(elements: UIElement[], autoInsert, allowMoveIn) {
        // if (this.props.type === ArtboardType.IconSet) {
        //     return false;
        // }

        for (let i = 0; i < elements.length; ++i) {
            let element = elements[i];
            if (element instanceof Artboard) {
                return false;
            }

            if (this.props.type === ArtboardType.Symbol && element.children !== undefined) {
                let can = true;
                let id = this.id;
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
                let root = element.primitiveRoot();
                let stateboards = this.runtimeProps.stateBoards;
                for (let j = 0; j < stateboards.length; ++j) {
                    if (stateboards[j] === root) {
                        return false;
                    }
                }
            }
        }

        return super.canAccept(elements, autoInsert, allowMoveIn);
    }

    displayName() {
        if (this._recorder.statesCount() > 1) {
            return this.props.name + " (" + this._recorder.getStateById("default").name + ")";
        }
        return super.displayName();
    }

    displayType() {
        switch (this.props.type) {
            case ArtboardType.Frame:
                return "type.a_frame";
            case ArtboardType.Palette:
                return "type.a_palette";
            case ArtboardType.Symbol:
                return "type.a_symbol";
            case ArtboardType.Template:
                return "type.a_template";
            case ArtboardType.IconSet:
                return "type.a_iconset";
            default:
                return super.displayType();
        }
    }

    drawShadowPath(context, environment: RenderEnvironment) {
        if (environment.flags & (RenderFlags.Offscreen | RenderFlags.Preview)) {
            return;
        }

        let scale = environment.scale * environment.contextScale;
        let s4 = 4 / scale;
        let bb = this.getBoundingBoxGlobal();
        context.rect(bb.x + bb.width, bb.y + s4, s4, bb.height);
        context.rect(bb.x + s4, bb.y + bb.height, bb.width, s4);
    }

    drawFrameRect(context, environment: RenderEnvironment) {
        if (environment.flags & (RenderFlags.Offscreen | RenderFlags.Preview)) {
            return;
        }
        context.save();
        context.beginPath();
        context.strokeStyle = "#999";
        let scale = environment.scale;
        context.lineWidth = 1 / scale;

        let bb = this.getBoundingBoxGlobal();
        context.rect(bb.x - .5 / scale, bb.y - .5 / scale, bb.width + 1 / scale, bb.height + 1 / scale);
        context.stroke();
        context.restore();
    }

    drawCustomFrame(context, environment: RenderEnvironment) {
        let frame = this.frame;

        context.save();
        let pos = this.position;
        context.translate(pos.x + this.frame.runtimeProps.frameX, pos.y + this.frame.runtimeProps.frameY);
        frame.runtimeProps.ctxl = this.runtimeProps.ctxl;
        frame.draw(context, environment);
        context.restore();
    }

    drawExtras(context, environment: RenderEnvironment) {
        if (environment.flags & (RenderFlags.Offscreen | RenderFlags.Preview)) {
            return;
        }

        if (this._recorder && this._recorder.statesCount() > 1) {
            this._renderStatesFrame(context, environment);
        }

        this._renderHeader(context, environment);
    }

    fitTextToWidth(context, text, width) {
        let m = measureText(context, text);
        params.perf && performance.mark("fitTextToWidth");
        if (m.width > width) {
            let elipsisWidth = measureText(context, '...').width;
            width -= elipsisWidth;
            do {
                text = text.substr(0, text.length - 1);
                m = measureText(context, text);
            } while (text !== '' && m.width > width);
            text += '...';
        }
        params.perf && performance.measure("fitTextToWidth", "fitTextToWidth");

        return text;
    }

    _renderHeader(context, environment) {
        let scale = environment.scale;
        let view = (environment as any).view;
        if (!view) {
            return; // this is hack but has no other options
        }
        context.save();
        context.beginPath();

        this.viewMatrix().applyToContext(context);
        if (this._active) {
            context.fillStyle = SharedColors.ArtboardActiveText;
        } else {
            context.fillStyle = SharedColors.ArtboardText;
        }

        context.font = "11 px Arial, Helvetica, sans-serif";

        let width = this.width;
        let rect = this.getBoundaryRectGlobal();

        let pos = view.logicalCoordinateToScreen(rect);
        let px = 0;
        if (environment.flags & RenderFlags.Prototyping) {
            px = 14;
        }

        let text = this.fitTextToWidth(context, this.headerText(), (width - px) * scale);
        context.beginPath();
        context.resetTransform();
        context.scale(environment.contextScale, environment.contextScale);

        context.fillText(text, pos.x + px, pos.y - 2 * environment.contextScale);

        context.restore();
    };

    clipSelf() {
        return App.Current.clipArtboards() || super.clipSelf();
    }

    _renderStatesFrame(context, environment: RenderEnvironment) {
        let stateboards = this.runtimeProps.stateBoards;
        if (!stateboards || !stateboards.length) {
            return;
        }

        context.save();
        context.beginPath();

        let states = this.props.states;
        if (states.length !== 0 && stateboards.length !== states.length - 1) {
            //can happen if artboard is drawn prior to stateboards linked themselves
            stateboards = this._linkRelatedStateBoards();
        }

        let rect: IRect = this.getBoundaryRectGlobal();
        for (let i = 0; i < stateboards.length; ++i) {
            rect = math.combineRects(rect, stateboards[i].getBoundaryRectGlobal());
        }

        let scale = environment.scale;
        let d = Math.max(1, scale);
        let x = rect.x - 20 / d;
        rect.width += 40 / d;
        let y = rect.y - 30 / d;
        rect.height += 50 / d;

        let dw = 10 / d;

        context.beginPath();
        context.moveTo(x + dw, y);
        context.lineTo(x, y);
        context.lineTo(x, y + rect.height);
        context.lineTo(x + dw, y + rect.height)

        context.moveTo(x + rect.width - dw, y);
        context.lineTo(x + rect.width, y);
        context.lineTo(x + rect.width, y + rect.height);
        context.lineTo(x + rect.width - dw, y + rect.height)
        // context.rect(x, y, rect.width, rect.height);
        context.strokeStyle = SharedColors.ArtboardText;
        context.lineWidth = 1 / scale;
        context.stroke();

        if (scale >= 0.5) {
            context.font = (0 | (10 / scale)) + "px Arial, Helvetica, sans-serif";
            context.beginPath();
            context.rectPath(x, y - 20 / scale, Math.max(150, this.width), 20 / scale);
            context.clip();

            context.fillStyle = SharedColors.ArtboardText;

            context.fillText(this.props.name, x, y - 5 / scale);
        }

        context.restore();
    };

    clone() {
        let clone = super.clone.apply(this, arguments);
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
        this.collapseHitTestBoxIfNeeded();
        this.resetGlobalViewCache();
        this._recorder && this._recorder.stop();
    }

    fillBackground(context, l, t, w, h, environment: RenderEnvironment) {
        if (environment.flags & RenderFlags.ArtboardFill || this.props.renderBackground) {
            super.fillBackground(context, l, t, w, h, environment);
            this.onBackgroundDrawn && this.onBackgroundDrawn(this, context);
        }
    }

    strokeBorder(context, w, h, environment: RenderEnvironment) {
        if (((environment.flags & RenderFlags.ArtboardFill && !(environment.flags & RenderFlags.Preview))) || this.props.renderBackground) {
            super.strokeBorder(context, w, h, environment);
        }
    }

    drawSelf(context: IContext, w, h, environment: RenderEnvironment) {
        if (this._drawing) {
            return;
        }
        this._drawing = true;
        context.save();

        let frame = this.frame;
        if (frame && (environment.flags & RenderFlags.ShowFrames)) {
            this.drawCustomFrame(context, environment);
            context.beginPath();
            let pos = this.position;
            context.rect(pos.x, pos.y, frame.runtimeProps.cloneScreenWidth, frame.runtimeProps.cloneScreenHeight);
            context.clip();
        }
        else if (App.Current.clipArtboards()) {
            context.beginPath();
            let br = this.getBoundingBoxGlobal();
            context.rect(br.x, br.y, br.width, br.height);
            context.clip();
        }

        super.drawSelf(context, w, h, environment);
        this.onContentDrawn && this.onContentDrawn(this, context);

        if (this.props.type === ArtboardType.IconSet) {
            this.drawIconsGrid(context);
        }

        if (!frame || !(environment.flags & RenderFlags.ShowFrames)) {
            this.drawFrameRect(context, environment);
        }

        context.restore();

        this._drawing = false;
    }

    drawIconsGrid(context) {
        let c = this.props.colsCount;
        let r = this.props.rowsCount;
        let s = this.props.iconCellSize;
        let v = 0;
        let box = this.getBoundaryRectGlobal();
        let w = box.width;
        let h = box.height;
        context.beginPath();

        for (let i = 1; i < c; ++i) {
            v = (s + 1) * i - 0.5;
            context.moveTo(box.x + v, box.y + 0);
            context.lineTo(box.x + v, box.y + h);
        }

        for (let i = 1; i < r; ++i) {
            v = (s + 1) * i - 0.5;
            context.moveTo(box.x + 0, box.y + v);
            context.lineTo(box.x + w, box.y + v);
        }

        context.strokeStyle = 'rgb(180,180,180)';
        context.stroke();
    }

    buildMetadata(properties) {
        let element = this;
        let res = {};

        let childrenMap = {};
        for (let i = 0; i < properties.length; ++i) {
            let prop = properties[i];
            let child = childrenMap[prop.controlId];
            if (!child) {
                child = this.getElementById(prop.controlId);
                childrenMap[prop.controlId] = child;
            }
            let propMetadata = PropertyMetadata.find(child.t, prop.propertyName);
            res['custom:' + prop.controlId + ':' + prop.propertyName] = propMetadata;
        }

        res['groups'] = function () {
            return [
                {
                    label: "",
                    id: "layout",
                    properties: ["position", "size", "rotation"]
                },
                {
                    label: element.name,
                    properties: ['stateId'].concat(properties.map(p => {
                        return 'custom:' + p.controlId + ':' + p.propertyName
                    }))
                },
                // {
                //     label: "Actions",
                //     properties: ["actions"]
                // },
                // {
                //     label: "@constraints",
                //     properties: ["constraints"]
                // }
            ];
        }

        return res;
    }

    _addIconCell(i/*col*/, j/*row*/, cols, rows, size, margin) {
        let cell = new IconsetCell();
        var props = cell.props;
        props.br = new Rect(0, 0, size, size);
        props.m = Matrix.createTranslationMatrix(i * (size + margin), j * (size + margin));
        props.name = `Icon(${i},${j})`;

        cell.addFlags(UIElementFlags.Icon);
        this.insert(cell, j * cols + i);

        cell.runtimeProps.ctxl = this.runtimeProps.ctxl;

        return cell;
    }

    propsUpdated(props: Partial<IArtboardProps>, oldProps: Partial<IArtboardProps>, mode: ChangeMode) {
        super.propsUpdated.apply(this, arguments);
        let hasParent = this.hasParent();

        let parent = this.parent as IArtboardPage | IContainer;
        if (props.state !== undefined) {
            if (this._recorder && this._recorder.hasState(props.state)) {
                this._recorder.changeState(props.state);
                this.stateChanged.raise(props.state);
            }
        }

        if (props.code) {
            this.runtimeProps.codeVersion = (this.runtimeProps.codeVersion || 0) + 1;
        }

        if (hasParent && oldProps.type !== props.type && oldProps.type !== ArtboardType.Regular) {
            App.Current.resourceDeleted.raise(oldProps.type, this, parent);

            if (props.type === ArtboardType.Regular) {
                this.disablePropsTracking();
                parent.disablePropsTracking();
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

        if (hasParent && oldProps.type !== props.type) {
            if (props.type === ArtboardType.Regular) {
                if (oldProps.type === ArtboardType.IconSet) {
                    this._restoreFromIconset();
                }
            } else {
                if (Selection.isOnlyElementSelected(this)) {
                    Selection.refreshSelection();
                }

                if (hasParent) {
                    if (props.type === ArtboardType.Symbol && !parent.props.symbolGroups.length) {
                        parent.patchProps(PatchType.Insert, "symbolGroups", { id: "default", name: CoreIntl.label("@page.defaultSymbolGroup") });
                    }
                    else if (props.type === ArtboardType.IconSet) {
                        setTimeout(() => {
                            this._convertToIconset();
                        }, 0);
                    }

                    this.enablePropsTracking();
                    parent.enablePropsTracking();
                }

                App.Current.resourceAdded.raise(props.type, this);
            }

        }

        if (hasParent && (props.rowsCount || props.colsCount || props.iconCellSize)) {
            this._rearrangeIcons(props, oldProps);
        }

        if (props.frame === null) {
            delete this._frame;
        }

        if (hasParent && (mode === ChangeMode.Model && props.br)) {
            if (props.br.width < oldProps.br.width || props.br.height < oldProps.br.height) {
                this.spit();
            }
            else {
                this.suck();
            }
        }
    }

    dropElement(element, mode) {

        if (this.props.type === ArtboardType.IconSet) {
            let elementBox = element.getBoundingBoxGlobal();
            let parent: IContainer = this;
            for (let i = 0; i < this.children.length; ++i) {
                if (this.children[i].getBoundingBoxGlobal().isIntersecting(elementBox)) {
                    parent = this.children[i] as any;
                    break;
                }
            }

            element.setTransform(parent.globalMatrixToLocal(element.globalViewMatrix()));
            parent.add(element, mode);
        } else {
            element.setTransform(this.globalMatrixToLocal(element.globalViewMatrix()));
            this.add(element, mode);
        }
    }

    _convertToIconset() {
        let iconCellSize = 32;// TODO: get form prop
        let rowsCount = 0 | this.height / iconCellSize;
        let colsCount = 0 | this.width / iconCellSize;
        let margin = IconCellsMargin;

        var children = this.children.slice();

        if (rowsCount * colsCount < children.length) {
            rowsCount = 0 | children.length / colsCount;
            if (rowsCount * colsCount < children.length) {
                rowsCount++;
            }
        }

        if (children.length === 0) {
            rowsCount = Math.min(16, rowsCount);
            colsCount = Math.min(16, colsCount);
        }

        App.Current.beginUpdate();
        PropertyTracker.suspend();

        for (let i = 0; i < children.length; ++i) {
            let child = children[i];
            iconCellSize = Math.max(iconCellSize, child.width + 2, child.height + 2);
            this.remove(child);
        }

        let item = 0;
        for (let j = 0; j < rowsCount; ++j) {
            for (let i = 0; i < colsCount; ++i) {
                let cell = this._addIconCell(i, j, colsCount, rowsCount, iconCellSize, margin);
                let bbCell = cell.getBoundingBoxGlobal();

                if (item < children.length) {
                    let child = children[item];
                    let bb = child.getBoundingBoxGlobal();
                    child.translate(bbCell.x - bb.x + (bbCell.width - bb.width) / 2 | 0, bbCell.y - bb.y + (bbCell.height - bb.height) / 2 | 0);
                    cell.transferElement(child, cell.children.length);
                    cell.add(child);
                    item++;
                }
            }
        }

        this.setProps({
            rowsCount: rowsCount,
            colsCount: colsCount,
            iconCellSize: iconCellSize,
            width: colsCount * (iconCellSize + margin) - margin,
            height: rowsCount * (iconCellSize + margin) - margin,
        });

        this.clearRenderingCache();
        PropertyTracker.resumeAndFlush();
        App.Current.endUpdate();
    }

    _rearrangeIcons(props, oldProps) {
        let margin = IconCellsMargin;
        let rows = props.rowsCount || this.props.rowsCount;
        let oldRows = oldProps.rowsCount || this.props.rowsCount;
        let cols = props.colsCount || this.props.colsCount;
        let oldCols = oldProps.colsCount || this.props.colsCount;
        let size = props.iconCellSize || this.props.iconCellSize;
        let oldSize = oldProps.iconCellSize || this.props.iconCellSize;

        if (rows === oldRows && cols === oldCols && size === oldSize) {
            return;
        }

        if (rows < oldRows) {
            for (let i = oldRows - 1; i >= rows; --i) {
                for (let j = oldCols - 1; j >= 0; --j) {
                    let index = i * oldCols + j;
                    let cell = this.children[index];
                    this.remove(cell);
                }
            }
        }

        if (cols < oldCols) {
            for (let j = Math.min(oldRows, rows) - 1; j >= 0; --j) {
                for (let i = oldCols - 1; i >= cols; --i) {
                    let index = j * oldCols + i;
                    let cell = this.children[index];
                    this.remove(cell);
                }
            }
        }

        if (size !== oldSize) {
            var c = Math.min(cols, oldCols);
            for (var i = 0; i < c; ++i) {
                for (var j = 0; j < Math.min(rows, oldRows); ++j) {
                    let index = j * c + i;
                    let child = this.children[index];
                    child.setProps({
                        width: size,
                        height: size,
                        m: Matrix.createTranslationMatrix(i * (size + margin), j * (size + margin))
                    })
                }
            }
        }

        if (cols > oldCols) {
            for (let j = 0; j < Math.min(rows, oldRows); ++j) {
                for (let i = oldCols; i < cols; ++i) {
                    this._addIconCell(i, j, cols, rows, size, margin);
                }
            }
        }

        if (rows > oldRows) {
            for (let j = oldRows; j < rows; ++j) {
                for (let i = 0; i < cols; ++i) {
                    this._addIconCell(i, j, oldCols, rows, size, margin);
                }
            }
        }

        this.setProps({
            width: (size + margin) * cols - margin,
            height: (size + margin) * rows - margin
        })

        this.clearRenderingCache();
    }

    _restoreFromIconset() {

    }

    getHitTestBox() {
        if (this.props.hitTestBox) {
            return this.props.hitTestBox;
        }
        return super.getHitTestBox.apply(this, arguments);
    }

    isInViewport(viewport: IRectData) {
        if (!this.props.hitTestBox) {
            return super.isInViewport(viewport);
        }

        //artboard can be translated only
        let gm = this.globalViewMatrix();
        let rect = Rect.allocateFromRect(this.props.hitTestBox);
        rect.x += gm.tx;
        rect.y += gm.ty;

        let intersects = areRectsIntersecting(rect, viewport);
        rect.free();

        return intersects;
    }

    /**
     * Hit-testing strategy:
     * - Artboard response to hit-testing using extended hit-test box, if any.
     * - When hitting elements inside the artboard, it is further refined if an element is really hit.
     * - Artboard tool still uses hit testing by bounding box only.
     */
    hitTest(point, view) {
        let res = super.hitTest(point, view);
        if (res) {
            return res;
        }
        if (this.hasBadTransform()) {
            return false;
        }
        return this.hitTestHeader(point, view);
    }

    hitTestBoundingBox(point, view) {
        if (this.hasBadTransform()) {
            return false;
        }
        let rect = super.getHitTestBox(view);
        return this.hitTestLocalRect(rect, point, view) || this.hitTestHeader(point, view);
    }

    select(mode, view) {
        this.canSelect(true);
        this.canDrag(true);
    }

    unselect() {
        this.canSelect(false);
        this.canDrag(false);
    }

    private hitTestHeader(point, view: IView) {
        let bb = this.getBoundingBoxGlobal();
        let scale = view.scale();
        return isPointInRect({ x: bb.x, y: bb.y - 20 / scale, width: bb.width, height: 20 / scale }, point);
    }

    /**
     * If an artboard hits itself and has an extended hit test box, it has to be validated
     * if the artboard is "really" hit by checking the boundary rect.
     */
    hitElement(position: ICoordinate, view: IView, predicate?, directSelection?): IUIElement {
        let element = super.hitElement.apply(this, arguments);
        if (!element) {
            return null;
        }

        if (this.canSelect()) {
            element = this;
        }

        if (element === this && this.props.hitTestBox) {
            if (!this.hitTestBoundingBox(position, view)) {
                return null;
            }
        }

        return element;
    }

    private extendHitTestBoxIfNeeded(changedElement: IUIElement) {
        if (changedElement === this) {
            return;
        }
        let elementBox = changedElement.getBoundingBoxGlobal();
        if (!elementBox.isValid()) {
            return;
        }
        let artboardGlobalBox = this.getBoundingBoxGlobal();
        let hitTestBoxGlobal = artboardGlobalBox;
        if (this.props.hitTestBox) {
            let gm = this.globalViewMatrix();
            let r = this.props.hitTestBox;
            hitTestBoxGlobal = new Rect(r.x + gm.tx, r.y + gm.ty, r.width, r.height);
        }
        if (!hitTestBoxGlobal.containsRect(elementBox)) {
            this.setProps({ hitTestBox: hitTestBoxGlobal.combine(elementBox).translate(-artboardGlobalBox.x, -artboardGlobalBox.y) });
        }
    }

    private collapseHitTestBoxIfNeeded() {
        if (!this.props.hitTestBox) {
            return;
        }

        let artboardBox = this.getBoundingBoxGlobal();
        let hitTestBox = artboardBox;
        this.applyVisitor(element => {
            if (element !== this) {
                let elementBox = element.getBoundingBoxGlobal();
                if (!artboardBox.containsRect(elementBox)) {
                    hitTestBox = hitTestBox.combine(elementBox);
                }
            }
        });

        if (!artboardBox.containsRect(hitTestBox)) {
            let newHitTestBox = hitTestBox.translate(-artboardBox.x, -artboardBox.y);
            if (!newHitTestBox.equals(this.props.hitTestBox)) {
                this.setProps({ hitTestBox: newHitTestBox });
            }
        }
        else {
            this.setProps({ hitTestBox: null });
        }
    }

    spit() {
        let artboardBox = this.getBoundingBoxGlobal();
        let parent = this.parent as Container;
        for (let i = this.children.length - 1; i >= 0; --i) {
            let child = this.children[i];
            let childBox = child.getBoundingBoxGlobal();
            if (!areRectsIntersecting(artboardBox, childBox)) {
                parent.transferElement(child, parent.children.length);
            }
        }
    }
    suck() {
        let artboardBox = this.getBoundingBoxGlobal();
        let parent = this.parent as IContainer;
        for (let i = 0; i < parent.children.length; ++i) {
            let child = parent.children[i];
            if (child instanceof Artboard) {
                continue;
            }
            let childBox = child.getBoundingBoxGlobal();
            if (areRectsIntersecting(artboardBox, childBox)) {
                this.transferElement(child, this.children.length);
            }
        }
    }

    primitiveRoot(): IPrimitiveRoot & UIElement {
        if (!this.parent || !this.parent.primitiveRoot()) {
            return null;
        }
        return this;
    }

    primitivePath() {
        let parent = this.parent;
        if (!parent || !parent.primitiveRoot()) {
            return null;
        }
        let path = this.runtimeProps.primitivePath;
        if (!path) {
            path = parent.primitivePath().slice();
            path[path.length - 1] = this.id;
            path.push(this.id);
            this.runtimeProps.primitivePath = path;
        }
        return path;
    }

    primitiveRootKey() {
        let parent = this.parent;
        if (!parent || !parent.primitiveRoot()) {
            return null;
        }
        let s = this.runtimeProps.primitiveRootKey;
        if (!s) {
            s = parent.id + this.id;
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
        let res = [];
        this.applyVisitor(e => {
            if (e !== this) {
                res.push(e);
            }
        })

        res.sort((e1, e2) => {
            return e1.displayName() - e2.displayName();
        })

        return res;
    }

    relayoutCompleted() {
        //isolation hides original controls, which would be cloned in symbols
        if (!IsolationContext.isActive) {
            this.incrementVersion();
        }
    }

    attachDisposable(disposable: IDisposable) {
        this.runtimeProps.disposables = this.runtimeProps.disposables || new AutoDisposable();
        this.runtimeProps.disposables.add(disposable)
    }

    incrementVersion() {
        this.runtimeProps.version++;

        let parent = this.parent as IPage;
        if (parent) {
            parent.incrementVersion();

            if (this.props.type !== ArtboardType.Regular) {
                App.Current.resourceChanged.raise(this.props.type, this);
            }
        }
    }

    get version() {
        let artboard = this;
        if (this.runtimeProps.sourceArtboard) {
            artboard = this.runtimeProps.sourceArtboard;
        }

        return artboard.runtimeProps.version;
    }

    get codeVersion() {
        let artboard = this;
        if (this.runtimeProps.sourceArtboard) {
            artboard = this.runtimeProps.sourceArtboard;
        }

        return artboard.runtimeProps.codeVersion;
    }

    mousedown(event: IMouseEventData) {
        let scale = event.view.scale();
        let pos = this.position;
        if (!this.canSelect() && !Selection.isElementSelected(this) && isPointInRect({ x: pos.x, y: pos.y - 20 / scale, width: this.width, height: 20 / scale }, event)) {
            (this.parent as any).setActiveArtboard(this);
            event.handled = true;
        }
    }

    dblclick(event: IMouseEventData) {
        if (this.hitTestHeader(event, event.view)) {
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
        params.perf && performance.mark("Artboard.Relayout: " + this.id);
        let res = RelayoutEngine.run(this, oldPropsMap);
        params.perf && performance.measure("Artboard.Relayout: " + this.id, "Artboard.Relayout: " + this.id);
        return res;
    }

    get stateId() {
        return 'default';
    }

    getStates() {
        return this._recorder.states;
    }

    state(value?) {
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
        var Symbol = PropertyMetadata.findAll(Types.Symbol)._class;
        PropertyMetadata.replaceForNamedType('user:' + this.name, Symbol, this.buildMetadata(this.props.customProperties));
    }

    duplicateState(name, newName) {
        this._recorder.duplicateState(name, newName);
    }

    removeState(name) {
        this._recorder.removeState(name);
    }

    registerSetProps(element, props, oldProps, mode) {
        super.registerSetProps(element, props, oldProps, mode);

        this.extendHitTestBoxIfNeeded(element);

        if (this.props.states.length !== 0) {
            this._recorder.trackSetProps("default", element.id, props, oldProps);
        }

        // TODO: move it to stateBoard controller class
        let stateBoards = this.runtimeProps.stateBoards;
        for (let i = 0; i < stateBoards.length; ++i) {
            let stateBoard = stateBoards[i];
            let transferProps = {};
            let hasAnyProps = false;
            for (let propName in props) {
                if (element === this && (propName === 'm' || propName === 'customProperties' || propName === 'state' || propName === "states" || propName === "actions" || propName === "type" || propName === "tileSize" || propName === "insertAsContent")) {
                    continue;
                }

                if (!this._recorder.hasStatePropValue(stateBoard.stateId, element.id, propName)) {
                    transferProps[propName] = props[propName];
                    hasAnyProps = true;
                }
            }
            if (hasAnyProps) {
                stateBoard.transferProps(element.id, transferProps);
            }
        }
    }

    propsPatched(patchType, propName, item) {
        super.propsPatched(patchType, propName, item);

        if (propName === 'states' && patchType === PatchType.Remove) {
            let stateBoards = this.runtimeProps.stateBoards;
            for (let i = 0; i < stateBoards.length; ++i) {
                let stateBoard = stateBoards[i];
                if (stateBoard.stateId === item.id) {
                    stateBoard.parent.remove(stateBoard);
                    break;
                }
            }
        }
    }

    registerInsert(parent, element, index, mode) {
        super.registerInsert(parent, element, index, mode);

        this.extendHitTestBoxIfNeeded(element);

        if (this.props.states.length !== 0) {
            this._recorder.trackInsert(parent, element, index);
        }

        // TODO: move it to stateBoard controller class
        let stateBoards = this.runtimeProps.stateBoards;
        for (let i = 0; i < stateBoards.length; ++i) {
            let stateBoard = stateBoards[i];
            stateBoard.transferInsert(parent, element, index);
        }
    }

    transferInsert(fromStateId, parentId, element, index) {
        let parent = this.getElementById(parentId);
        parent.insert(element, index, ChangeMode.Root);
        ModelStateListener.trackInsert(this, parent, element, index);
        this._recorder.trackInsert(element.id);

        // TODO: move it to stateBoard controller class
        let stateBoards = this.runtimeProps.stateBoards;
        for (let i = 0; i < stateBoards.length; ++i) {
            let stateBoard = stateBoards[i];
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

    trackDeleted(parent: IArtboardPage) {
        delete this.runtimeProps.primitivePath;
        delete this.runtimeProps.primitiveRootKey;

        // TODO: move it to stateBoard controller class
        let stateBoards = this.runtimeProps.stateBoards;
        for (let i = 0; i < stateBoards.length; ++i) {
            let stateBoard = stateBoards[i];
            stateBoard.parent.remove(stateBoard);
        }

        if (this.props.type === ArtboardType.Symbol) {
            this.flattenSymbolInstances(parent);
        }

        if (this.props.type !== ArtboardType.Regular) {
            App.Current.resourceDeleted.raise(this.props.type, this, parent);
        }

        super.trackDeleted.apply(this, arguments);

        parent.setActiveArtboard(null);
    }

    registerDelete(parent, element, index, mode) {
        super.registerDelete(parent, element, index, mode);
        if (this.props.states.length !== 0) {
            this._recorder.trackDelete(parent, element.id);
        }

        // TODO: move it to stateBoard controller class
        let stateBoards = this.runtimeProps.stateBoards;
        for (let i = 0; i < stateBoards.length; ++i) {
            let stateBoard = stateBoards[i];
            stateBoard.transferDelete(element);
        }
    }

    removeStateById(stateId) {
        this._recorder.removeStateById(stateId);
        let stateBoards = this.runtimeProps.stateBoards;
        for (let i = 0; i < stateBoards.length; ++i) {
            if (stateBoards[i].props.stateId === stateId) {
                stateBoards.splice(i, 1);
                break;
            }
        }
    }

    registerChangePosition(parent, element, index, oldIndex) {
        super.registerChangePosition(parent, element, index, oldIndex);
        if (this.props.states.length !== 0) {
            this._recorder.trackChangePosition(parent, element.id, index, oldIndex);
        }

        // TODO: move it to stateBoard controller class
        let stateBoards = this.runtimeProps.stateBoards;
        for (let i = 0; i < stateBoards.length; ++i) {
            let stateBoard = stateBoards[i];
            stateBoard.transferChangePosition(element, index);
        }
    }

    fromJSON() {
        super.fromJSON.apply(this, arguments);
        if (this._recorder) {
            this._recorder.initFromJSON(this.props.states);
        }

        return this;
    }

    getRecorder() {
        return this._recorder;
    }

    linkNewStateBoard(stateBoard) {
        let margin = 40;
        let box = this.getBoundingBox();
        let width = box.width;
        let height = box.height;
        let statesCount = this._recorder.statesCount();

        stateBoard.setProps({
            masterId: this.id,
            width: width,
            height: height,
            name: this.props.name
        }, ChangeMode.Self);
        stateBoard.applyTranslation(new Point(box.x, box.y + (statesCount - 1) * (height + margin)), false, ChangeMode.Self);

        for (let i = 0; i < this.children.length; i++) {
            let e = this.children[i];
            let clone = e.clone();
            clone.setProps({ masterId: e.id }, ChangeMode.Self);
            stateBoard.add(clone, ChangeMode.Root);
        }

        this.linkStateBoard(stateBoard);
    }

    linkStateBoard(stateBoard) {
        stateBoard.artboard = this;

        if (!stateBoard.parent || stateBoard.parent === NullContainer) {
            this.parent.add(stateBoard);
        }
        this.runtimeProps.stateBoards.push(stateBoard);
    }

    _linkRelatedStateBoards() {
        let id = this.id;
        let stateBoards = this.runtimeProps.stateBoards;
        let missingLinks = this.props.states.filter(x => x.id !== "default" && !stateBoards.some(y => x.id === y.props.stateId));
        for (let i = 0; i < missingLinks.length; i++) {
            let stateId = missingLinks[i].id;
            let stateBoard = this.parent.findNodeBreadthFirst(x => x.props.masterId === id && x.props.stateId === stateId);
            this.linkStateBoard(stateBoard);
        }
        return stateBoards;
    }

    getStateboards() {
        return this.runtimeProps.stateBoards;
    }

    replaceAction(oldAction, newAction) {
        let index = this.props.actions.findIndex(a => a === oldAction);
        if (index >= 0) {
            let newActions = this.props.actions.slice();
            newActions.splice(index, 1, newAction);
            this.setProps({ actions: newActions });
        }
    }

    isEditable() {
        return this.canSelect() || this.multiselectTransparent;
    }

    onIsolationExited() {
    }

    code(value?: string): string {
        let artboard = this;
        if (this.runtimeProps.sourceArtboard) {
            artboard = this.runtimeProps.sourceArtboard;
        }

        if (arguments.length > 0) {
            artboard.setProps({ code: value })
        }

        return artboard.props.code;
    }

    get exports(): { [name: string]: string } {
        let artboard = this;
        if (this.runtimeProps.sourceArtboard) {
            artboard = this.runtimeProps.sourceArtboard;
        }

        return artboard.runtimeProps.exports;
    }

    set exports(value: { [name: string]: string }) {
        let artboard = this;
        if (this.runtimeProps.sourceArtboard) {
            artboard = this.runtimeProps.sourceArtboard;
        }

        artboard.runtimeProps.exports = value;
    }

    declaration(module: boolean): string {
        let artboard = this;
        if (this.runtimeProps.sourceArtboard) {
            artboard = this.runtimeProps.sourceArtboard;
        }

        return ArtboardProxyGenerator.generate(artboard, module);
    }

    set currentState(value: string) {
        if (this.runtimeProps.stateController) {
            this.runtimeProps.stateController.currentState = value;
        }
    }

    get currentState(): string {
        if (this.runtimeProps.stateController) {
            return this.runtimeProps.stateController.currentState;
        }
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

    get stateAnimations() {
        return this.runtimeProps.stateAnimations;
    }

    nextState() {
        if (this.runtimeProps.stateController) {
            this.runtimeProps.stateController.nextState();
        }
    }

    prevState() {
        if (this.runtimeProps.stateController) {
            this.runtimeProps.stateController.prevState();
        }
    }

    private flattenSymbolInstances(page) {
        let pageId = page.id;
        let artboardId = this.id;
        let app = page.app;

        app.applyVisitorDepthFirst(e => {
            if (e.t === Types.Symbol) {
                let symbol = e as ISymbol;
                if (symbol.props.source.pageId === pageId && symbol.props.source.artboardId === artboardId) {
                    symbol.flatten();
                }
            }
        });
    }
}
Artboard.prototype.t = Types.Artboard;

PropertyMetadata.registerForType(Artboard, {
    fill: {
        defaultValue: Brush.White,
        options: {
            size: 1 / 4
        }
    },
    renderBackground: {
        displayName: "@display.background.preview",
        type: "checkbox",
        defaultValue: true
    },
    masterPageId: {
        displayName: "Master page",
        type: "pageLink",  //masterPageEditorOptions
    },
    layoutGridSettings: {
        defaultValue: null
    },
    guidesX: {
        defaultValue: []
    },
    guidesY: {
        defaultValue: []
    },
    type: {
        displayName: "@artboardType",
        type: "dropdown",
        defaultValue: ArtboardType.Regular,
        options: {
            items: [
                { name: "@regular", value: ArtboardType.Regular },
                { name: "@symbol", value: ArtboardType.Symbol },
                { name: "@template", value: ArtboardType.Template },
                { name: "@frame", value: ArtboardType.Frame },
                { name: "@palette", value: ArtboardType.Palette },
                { name: "@iconset", value: ArtboardType.IconSet },
            ]
        }
    },
    allowHorizontalResize: {
        displayName: "Allow horizontal resize",
        type: "checkbox",
        useInModel: true,
        defaultValue: true
    },
    allowVerticalResize: {
        displayName: "Allow vertical resize",
        type: "checkbox",
        useInModel: true,
        defaultValue: true
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
        type: "dropdown",
        defaultValue: TileSize.Small,
        options: {
            items: [
                { name: '@tilesize.small', value: TileSize.Small },
                { name: '@tilesize.large', value: TileSize.Large },
                { name: '@tilesize.xlarge', value: TileSize.XLarge },
            ]
        }
    },
    insertAsContent: {
        displayName: "@ascontent",
        type: 'checkbox',
        defaultValue: false
    },
    symbolGroup: {
        displayName: "@groupname",
        type: "symbolGroup",
        defaultValue: "default"
    },
    rowsCount: {
        displayName: "@rowsCount",
        type: 'numeric'
    },
    colsCount: {
        displayName: "@colsCount",
        type: 'numeric'
    },
    iconCellSize: {
        displayName: "@iconCellSize",
        type: 'numeric'
    },
    frame: {
        displayName: "@frame",
        type: "dropdown",
        defaultValue: null,
        getOptions: function (element) {
            let empty_option_name = 'none';  //fixme - translate!
            var items = [{ name: empty_option_name, value: null }];
            return {
                size: 3 / 4,
                items: items.concat(App.Current.getAllFrames().map(framed_artboard => {
                    return {
                        name: framed_artboard.name,
                        value: {
                            pageId: framed_artboard.parent.id,
                            artboardId: framed_artboard.id
                        }
                    }
                }))
            };
        }
    },
    hitTestBox: {
        defaultValue: null
    },
    prepareVisibility(element: Artboard) {
        let showAsStencil = element.props.type === ArtboardType.Symbol;
        let showAsIconset = element.props.type === ArtboardType.IconSet;
        let showAsRegular = element.props.type === ArtboardType.Regular;
        return {
            stroke: false,
            tileSize: showAsStencil,
            insertAsContent: showAsStencil && element.children.length === 1,
            symbolGroup: showAsStencil,
            allowVerticalResize: showAsStencil,
            allowHorizontalResize: showAsStencil,
            rowsCount: showAsIconset,
            colsCount: showAsIconset,
            iconCellSize: showAsIconset,
            states: showAsRegular,
            frame: showAsRegular
        }
    },
    proxyDefinition(): ProxyDefinition {
        return {
            rprops: ["width", "height", "name", "id", "children", "states"], // readonly props
            props: ["fill", "currentState"], // read/write props
            methods: [
                "boundaryRect",
                "add",
                "remove",
                "insert",
                "findElementByName",
                "attachDisposable",
                "setProperties",
                "getPropertiesSnapshot",
                "animate",
                "registerEventHandler",
                "raiseEvent",
                "nextState",
                "prevState",
                "registerStateAnimation"
            ],
            mixins: []
        }
    },
    groups: function () {
        return [
            {
                label: "",
                id: "layout",
                properties: ["position", "size"],
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
                properties: ["renderBackground", "type", "tileSize", "symbolGroup", "insertAsContent", "allowHorizontalResize", "allowVerticalResize", "rowsCount", "colsCount", "iconCellSize"],
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
