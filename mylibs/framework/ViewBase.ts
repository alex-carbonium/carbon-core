import AnimationController from "framework/animation/AnimationController";
import { areRectsIntersecting, combineRects } from "math/math";
import Matrix from "math/matrix";
import ContextPool from "framework/render/ContextPool";
import EventHelper from "framework/EventHelper";
import Selection from "framework/SelectionModel";
import Invalidate from "framework/Invalidate";
import { LayerType, IView, IAnimationController, ILayer, IUIElement, ViewState, IEvent, ICoordinate, IContext, ISize, IRect, IPoint, RenderEnvironment, RenderFlags } from "carbon-core";
import Rect from "../math/rect";
import AnimationGroup from "./animation/AnimationGroup";
import Context from "./render/Context";
import GlobalMatrixModifier from "./GlobalMatrixModifier";
import ExtensionPoint from "./ExtensionPoint";
import ContextLayerSource from "framework/render/ContextLayerSource";
import Point from "../math/point";

var Stopwatch = require("../Stopwatch");
var debug = require("DebugUtil")("carb:view");

const ZoomSteps = [0.02, 0.03, 0.06, 0.13, 0.25, 0.5, 1, 2, 4, 8, 16, 32, 64, 128, 256];
const ViewStateChangeTimeout = 1000;

function setupLayers(Layer) {
    var layer = new Layer(this);
    this._page = layer;

    this._registerLayer(layer);
}

function setupLayer(layer, context) {
    context.scale(this.contextScale, this.contextScale);

    layer.clearContext(context);

    if (layer.pageMatrix) {
        layer.pageMatrix.applyToContext(context);
    }
}

function onZoomChanged(value, oldValue) {
    var view = this;

    var sx = view.scrollX(),
        sy = view.scrollY();

    if (value < 0.01) {
        value = 0.01;
    }
    if (this.zoomToPoint) {
        sx += this.zoomToPoint.x * (value - oldValue);
        sy += this.zoomToPoint.y * (value - oldValue);
        view.scrollX(sx);
        view.scrollY(sy);
        view.scale(value);
    }
    else {
        var viewport = this.viewportSize();
        var scale = view.scale();
        sx /= scale;
        sy /= scale;
        sx += (viewport.width / scale) / 2;
        sy += (viewport.height / scale) / 2;
        view.scale(value);
        var scroll = this.app.activePage.pointToScroll({ x: sx, y: sy }, viewport);

        view.scrollX(scroll.scrollX);
        view.scrollY(scroll.scrollY);
    }

    Invalidate.request();
}


export default class ViewBase { //TODO: implement IView
    [name: string]: any;
    //TODO: move to platform
    viewContainerElement: HTMLElement;
    animationController: AnimationController;

    contextScale: number;
    scaleChanged: IEvent<number>;

    activeLayer: ILayer = null;
    activeLayerChanged: IEvent<ILayer> = EventHelper.createEvent<ILayer>();

    viewStateChanged = EventHelper.createEvent<ViewState>();
    private viewStateTimer = 0;
    private _viewState: ViewState = { scale: 0, sx: 0, sy: 0 };
    private _viewportRect = Rect.Zero;
    private _viewportSize = Rect.Zero;

    constructor(app) {
        this._registredForLayerDraw = [[], [], []];

        this.stopwatch = new Stopwatch("view", false);
        this._captureElement = null;
        this._width = 0;
        this._height = 0;

        this.viewMatrix = Matrix.create();

        this.contextScale = 1;
        this._focused = true;

        this.scaleChanged = EventHelper.createEvent();
        this.scaleMatrix = Matrix.create();

        this._layers = [];
        this.app = app;
    }

    _registerLayer(layer) {
        this._layers.push(layer);
        layer._view = this;
    }

    _unregisterLayer(layer) {
        var i = this._layers.findIndex(l => l === layer);
        if (i >= 0) {
            this._layers.splice(i, 1);
        }
    }

    _drawLayer(layer, context, environment: RenderEnvironment, skipSetup = false) {
        this.stopwatch.start();
        context.save();
        !skipSetup && setupLayer.call(this, layer, context);

        ExtensionPoint.invoke(layer, 'draw', [context, environment]);

        var subscribers = this._registredForLayerDraw[layer.type];
        for (var i = 0; i < subscribers.length; ++i) {
            subscribers[i].onLayerDraw(layer, context, environment);
        }

        context.restore();
        debug("layer %d, metrics: %d", layer.type, this.stopwatch.getElapsedTime())
    }

    _drawLayerPixelsVisible(scale) {
        var viewportSize = this.viewportSize();
        var vw = viewportSize.width * this.contextScale + 10 * scale;
        var vh = viewportSize.height * this.contextScale + 10 * scale;
        var sw = vw / scale;
        var sh = vh / scale;
        var context = ContextPool.getContext(sw, sh, this.contextScale);
        context.save();
        context.imageSmoothingEnabled = true;
        context.clearRect(0, 0, sw, sh);

        var matrix = Matrix.create();

        var dx = this.scrollX() % scale;
        var dy = this.scrollY() % scale;
        matrix.translate(-(0 | (this.scrollX()) / scale), -(0 | (this.scrollY()) / scale));

        var pageMatrix = this._page.pageMatrix;
        this._page.pageMatrix = matrix;

        let env = this._getEnv(this._page, true);
        this._drawLayer(this._page, context, env);

        this._page.pageMatrix = pageMatrix;

        this.context.save();
        this.context.resetTransform();
        this.context.clearRect(0, 0, vw, vh);
        this.context.imageSmoothingEnabled = false;
        this.context.translate(-dx * this.contextScale, -dy * this.contextScale);
        this.context.drawImage(context.canvas, 0, 0, sw, sh, 0, 0, vw, vh);
        this.context.restore();
        context.restore();

        ContextPool.releaseContext(context);
    }

    _getEnv(layer: any, final: boolean) {
        let env: RenderEnvironment = layer.env;

        if (!env) {
            let setupLayerHandler = setupLayer.bind(this, layer);
            env = layer.env = {
                scale: this.scale(),
                contextScale: this.contextScale,
                flags: RenderFlags.Default,
                pageMatrix: layer.pageMatrix,
                setupContext: function (context) {
                    setupLayerHandler(context);
                }
            };
        }

        env.pageMatrix = layer.pageMatrix;
        env.scale = this.scale();
        env.contextScale = this.contextScale;

        this.updateFlag(env, RenderFlags.ShowFrames, this.app.showFrames());
        this.updateFlag(env, RenderFlags.Final, final);

        return env;
    }

    private updateFlag(env: RenderEnvironment, flag: number, condition: boolean) {
        if (condition) {
            env.flags |= flag;
        }
        else {
            env.flags &= ~flag;
        }
    }

    setup(deps) {
        this.deps = deps;
        setupLayers.call(this, deps.Layer);
    }

    renderingScheduled() {
        return this._renderingScheduledCallback && this._renderingScheduledCallback();
    }

    setupRendering(contexts, requestRedrawCallback, cancelRedrawCallback, renderingScheduledCallback) {
        this.context = new ContextLayerSource(contexts);
        this.contexts = contexts;

        this._requestRedrawCallback = requestRedrawCallback;
        this._renderingScheduledCallback = renderingScheduledCallback;
        if (this.animationController) {
            this.animationController.setCallbacks(requestRedrawCallback, cancelRedrawCallback);
        } else {
            this.animationController = new AnimationController(requestRedrawCallback, cancelRedrawCallback);
        }

        this.requestRedraw();
    }

    registerForLayerDraw(layer, element, index?: number) {
        this.unregisterForLayerDraw(layer, element);
        if (index === undefined) {
            this._registredForLayerDraw[layer].push(element);
        }
        else {
            this._registredForLayerDraw[layer].splice(index, 0, element);
        }
    }

    unregisterForLayerDraw(layer, element) {
        var subscribers = this._registredForLayerDraw[layer];
        for (var i = 0; i < subscribers.length; ++i) {
            if (subscribers[i] === element) {
                subscribers.splice(i, 1);
                return;
            }
        }
    }

    setInitialPagePlace(page) {
        var size = this.viewportSize();
        page.zoomToFit(size);
        var scale = page.scale();
        page.scale(1);
        var scroll = page.scrollCenterPosition(size);
        page.scrollTo(scroll);

        delete page._placeBeforeRender;
        this.zoom(scale);
        this.app.actionManager.invoke("refreshZoom");
    }

    //TODO: encapsulate or rename to something else
    prototyping() {
        return false;
    }

    draw() {
        this.animationController.update();

        if (this._page.isInvalidateRequired()) {
            if (this._page._placeBeforeRender) {
                this.setInitialPagePlace(this._page);
            }

            for (let i = 0; i < this.context.contentContextCount; ++i) {
                this.contexts[i].save();
                if (this._page.layerRedrawMask === null || this._page.layerRedrawMask & (1 << i)) {
                    // console.log(`clear layer: ${1 << i}`)
                    setupLayer.call(this, this._page, this.contexts[i]);
                }
            }

            var scale = this.scale();
            if (scale > 1 && this.showPixels()) {
                this._drawLayerPixelsVisible(scale);
            } else {
                let env = this._getEnv(this._page, true);
                this._drawLayer(this._page, this.context, env, true);
            }

            for (let i = 0; i < this.context.contentContextCount; ++i) {
                this.contexts[i].restore();
            }
        }

        for (var i = 1; i < this._layers.length; ++i) {
            var layer = this._layers[i];
            if (layer.isInvalidateRequired()) {
                layer.pageMatrix = this._page.pageMatrix;
                let env = this._getEnv(layer, false);
                this._drawLayer(layer, layer.context, env);
            }
        }

        if (DEBUG) {
            for (let i = 0; i < this.contexts.length; ++i) {
                if (!this.contexts[i].isBalancedSaveRestore) {
                    throw new Error(`Unbalanced context ${i} saveCount ${this.contexts[i].saveCount}`);
                }
            }
        }
    }

    width(/*int*/value) {
        if (value !== undefined) {
            this._width = value;
        }
        return this._width;
    }

    height(/*int*/value) {
        if (value !== undefined) {
            this._height = value;
        }
        return this._height;
    }

    showPixels(value?) {
        if (value !== undefined) {
            this._showPixels = value;
        }
        return this._showPixels;
    }

    scale(value?, silent?: boolean) {
        var page = this.page;
        if (!page) {
            return 1;
        }

        var pageScale = page.scale();
        if (arguments.length) {
            if (value !== pageScale) {
                pageScale = page.scale(value);
                this.scaleChanged.raise(pageScale);

                if (!silent) {
                    this.raiseViewStateChanged();
                }
            }

            //matrix must always be reset
            this.scaleMatrix.reset();
            this.scaleMatrix.scale(pageScale, pageScale);
        }

        return pageScale;
    }

    view() {
        return this;
    }

    get page() {
        return this._page;
    }

    setActivePage(page) {
        Selection.clear();
        this._page = page;
        page._view = this;
        this._layers[0] = page;
        page.type = LayerType.Content;
        this.activateLayer(page.type);

        this.scale(page.scale());
    }

    global2local(/*Point*/pos) {
        return pos;
    }

    local2global(/*Point*/pos) {
        return pos;
    }

    getLayer(layerType: LayerType): ILayer {
        return this._layers.find(l => l.type === layerType);
    }

    activateLayer(layerType: LayerType, silent?: boolean) {
        var layer = this.getLayer(layerType);

        if (layer !== this.activeLayer) {
            if (this.activeLayer) {
                this.activeLayer.deactivate();
                this.activeLayer.isActive = false;
            }
            layer.isActive = true;
            this.activeLayer = layer;
            if (!silent) {
                this.activeLayerChanged.raise(layer);
            }
        }
    }

    deactivateLayer(layerType: LayerType, silent?: boolean) {
        var i = this._layers.findIndex(x => x.type === layerType);
        if (i) {
            this.activateLayer(this._layers[i - 1].type, silent);
        }
    }

    viewportRect() {
        let size = this.viewportSize();
        let scale = this.scale();

        let x = this.scrollX() / scale;
        let y = this.scrollY() / scale;
        let w = size.width / scale;
        let h = size.height / scale;

        this._viewportRect = this._viewportRect.with(x, y, w, h);

        return this._viewportRect;
    }

    viewportSize() {
        return this._viewportSize;
    }

    get viewState(): ViewState {
        var sx = this.scrollX();
        var sy = this.scrollY();
        var scale = this.scale();

        if (sx !== this._viewState.sx || sy !== this._viewState.sy || scale !== this._viewState.scale) {
            this._viewState = { sx, sy, scale };
        }

        return this._viewState;
    }

    isAtViewState(state: ViewState) {
        var currentState = this.viewState;
        return currentState.sx === state.sx
            && currentState.sy === state.sy
            && currentState.scale === state.scale;
    }

    changeViewState(newState: ViewState, silent?: boolean) {
        if (this.isAtViewState(newState)) {
            return;
        }

        this.scale(newState.scale, silent);
        this.scrollX(newState.sx, silent);
        this.scrollY(newState.sy, silent);

        // var animationValues = [];
        // var options = { duration: 180 };
        // var oldState = this.viewState;

        // animationValues.push({
        //     from: this.scrollX(), to: newState.sx, accessor: value => {
        //         if (arguments.length === 1) {
        //             return this.scrollX(value);
        //         }

        //         return this.scrollX();
        //     }
        // });

        // animationValues.push({
        //     from: this.scrollY(), to: newState.sy, accessor: value => {
        //         if (arguments.length === 1) {
        //             return this.scrollY(value);
        //         }

        //         return this.scrollY();
        //     }
        // });

        // animationValues.push({
        //     from: this.scale(), to: newState.scale, accessor: value => {
        //         if (arguments.length === 1) {
        //             return this.scale(value);
        //         }

        //         return this.scale();
        //     }
        // });

        // var group = new AnimationGroup(animationValues, options, () => {
        //     Invalidate.request();
        // });

        // if (!silent) {
        //     group.promise().then(() => this.viewStateChanged.raise(newState, oldState));
        // }

        // this.animationController.registerAnimationGroup(group);
    }

    raiseViewStateChanged() {
        if (this.viewStateTimer) {
            clearTimeout(this.viewStateTimer);
        }
        this.viewStateTimer = setTimeout(this.raiseViewStateChangedDebounced, ViewStateChangeTimeout);
    }
    raiseViewStateChangedDebounced = () => {
        this.viewStateChanged.raise(this.viewState);
        this.viewStateTimer = 0;
    }

    pointToScreen(point: ICoordinate) {
        var parentOffset = this.app.platform.containerOffset();
        return {
            x: parentOffset.left + point.x - this.page.scrollX(),
            y: parentOffset.top + point.y - this.page.scrollY()
        };
    }

    invalidate(layerType?, mask?) {
        if (layerType === undefined) {
            for (var i = 0; i < this._layers.length; i++) {
                this._layers[i].invalidate(0xffff);
            }
        }
        else {
            var layer = this._layers.find(l => l.type === layerType);
            if (layer) {
                layer.invalidate(mask || 0xffff);
            }
        }
        this.requestRedraw();
    }

    requestRedraw() {
        this._requestRedrawCallback && this._requestRedrawCallback();
    }

    parent() {
        return null;
    }

    isSameAs(element) {
        return element === this;
    }

    zOrder() {
        return null;
    }

    lockedGroup() {
        return false;
    }

    scrollX(value?, silent?: boolean) {
        var page = this.page;
        if (!page) {
            return 0;
        }

        if (value !== undefined) {

            value = ~~value;
            if (page.scrollX() !== value) {
                page.scrollX(value);
                this.invalidate();

                if (!silent) {
                    this.raiseViewStateChanged();
                }
            }
        }

        return page.scrollX();
    }

    scrollY(value?, silent?: boolean) {
        var page = this.page;
        if (!page) {
            return 0;
        }

        if (value !== undefined) {
            value = ~~value;
            if (page.scrollY() !== value) {
                page.scrollY(value);
                this.invalidate();

                if (!silent) {
                    this.raiseViewStateChanged();
                }
            }
        }
        return page.scrollY();
    }

    scrollTo(scrollPosition) {
        if (scrollPosition.scrollX) {
            this.scrollX(scrollPosition.scrollX);
        }
        if (scrollPosition.scrollY) {
            this.scrollY(scrollPosition.scrollY);
        }
    }

    ensureCentered(elements: IUIElement[]) {
        var rect = elements[0].getBoundingBoxGlobal();
        for (let element of elements) {
            rect = combineRects(rect, element.getBoundingBoxGlobal());
        }

        let pt = Point.allocate(rect.x + rect.width / 2, rect.y + rect.height / 2);
        this.scrollToPoint(pt);
        pt.free();
    }

    ensureScale(elements: IUIElement[]) {
        var rect = elements[0].getBoundingBoxGlobal();
        for (let element of elements) {
            rect = combineRects(rect, element.getBoundingBoxGlobal());
        }

        let scale = this.getScaleToFitRect(rect);
        this.scale(scale);
    }

    getScaleToFitRect(rect: IRect) {
        var size = this.viewportSize();
        var w = rect.width * 1.32;
        var h = rect.height * 1.32;
        var sx = size.width / w;
        var sy = size.height / h;
        return Math.min(sx, sy);
    }

    ensureVisibleRect(rect: IRect) {
        let viewport = this.viewportRect();
        if (viewport.containsRect(rect)) {
            return;
        }

        let newState: ViewState = Object.assign({}, this.viewState);
        let fitScale = this.getScaleToFitRect(rect);
        if (fitScale < newState.scale) {
            newState.scale = fitScale;

            let size = this.viewportSize();
            viewport = new Rect(newState.sx / newState.scale, newState.sy / newState.scale, size.width / newState.scale, size.height / newState.scale)
        }

        let union = viewport.combine(rect);
        let pt = Point.allocate(
            union.x < viewport.x ? union.x - viewport.x : union.x + union.width - viewport.x - viewport.width,
            union.y < viewport.y ? union.y - viewport.y : union.y + union.height - viewport.y - viewport.height);

        pt.x = pt.x * newState.scale;
        pt.y = pt.y * newState.scale;

        //add margins for tools, rulers, etc
        if (pt.x) {
            pt.x += Math.sign(pt.x) < 0 ? -80 : 10
        }
        if (pt.y) {
            pt.y += Math.sign(pt.y) < 0 ? -60 : 40;
        }

        newState.sx += pt.x;
        newState.sy += pt.y;
        this.changeViewState(newState);

        pt.free();
    }

    scrollToCenter() {
        var scroll = this.scrollCenterPosition();
        if (scroll.scrollX) {
            this.scrollX(scroll.scrollX);
        }

        if (scroll.scrollY) {
            this.scrollY(scroll.scrollY);
        }
    }

    scrollToPoint(pt: IPoint) {
        var scroll = this.page.pointToScroll(pt, this.viewportSize());
        if (scroll.scrollX) {
            this.scrollX(scroll.scrollX);
        }

        if (scroll.scrollY) {
            this.scrollY(scroll.scrollY);
        }
    }

    scrollCenterPosition() {
        return this.page.scrollCenterPosition(this.viewportSize(), this.scale());
    }

    scrollPosition() {
        return { scrollX: this.scrollX(), scrollY: this.scrollY() };
    }

    logicalCoordinateToScreen(point: ICoordinate): ICoordinate {
        return {
            x: (point.x * this.scale() - this.scrollX()),
            y: (point.y * this.scale() - this.scrollY())
        }
    }

    resize(rect) {
        this.width(rect.width);
        this.height(rect.height);
        for (var i = 0; i < this._layers.length; i++) {
            var layer = this._layers[i];
            layer.resize(rect);
        }
        this.invalidate();
    }

    visible() {
        return true;
    }

    hitVisible() {
        return true;
    }

    hitElement(eventData, includeInteractionLayer?: boolean): IUIElement | null {
        var start = includeInteractionLayer ? this._layers.length - 1 : this._layers.length - 2;
        for (var i = start; i >= 0; --i) {
            var layer = this._layers[i] as any;
            var element = layer.hitElement(eventData, this.scale(), null, Selection.directSelectionEnabled());
            if (element) {
                return element;
            }
        }

        return null;
    }

    get layers() {
        return this._layers;
    }

    dropToLayer(x: number, y: number, element: IUIElement): void {
        var layers = this.layers
        for (var i = layers.length - 1; i >= 0; --i) {
            var layer = layers[i];
            if (!layer.hitTransparent() && layer.canAccept([element])) {
                layer.dropToLayer(x, y, element);
                element.clearSavedLayoutProps();
                return;
            }
        }
    }

    hitElementDirect(mousePoint, callback, includeInteractionLayer?: boolean): IUIElement {
        var start = includeInteractionLayer ? this._layers.length - 1 : this._layers.length - 2;
        for (var i = this._layers.length - 1; i >= 0; --i) {
            var layer = this._layers[i] as any;
            if (!layer.hitTransparent()) {
                var element = layer.hitElementDirect(mousePoint, this.scale(), callback);
                if (element) {
                    return element;
                }
            }
        }

        return null;
    }

    focused(value) {
        if (arguments.length === 1) {
            this._focused = value;
        }
        return this._focused;
    }

    updateViewportSize(newSize) {
        if (this._viewportSize !== Rect.Zero) {
            var oldSize = this._viewportSize;
            var scale = this.scale();
            var sx = this.scrollX(),
                sy = this.scrollY();
            sx /= scale;
            sy /= scale;
            sx += (oldSize.width / scale) / 2;
            sy += (oldSize.height / scale) / 2;
            var scroll = this.app.activePage.pointToScroll({ x: sx, y: sy }, newSize);

            this.scrollX(scroll.scrollX);
            this.scrollY(scroll.scrollY);
        }
        this._viewportSize = this._viewportSize.withSize(newSize.width, newSize.height);
    }

    showContextMenu(eventData) {

    }

    cancel() {
    }

    zoom(value?, norefresh?) {
        if (value !== undefined) {
            if (!norefresh && (this.scale() !== value)) {
                onZoomChanged.call(this, value, this.scale());
            }
        }
        return this.scale();
    }

    zoomToFit() {
        var size = this.viewportSize();

        let scale = this.page.scaleToSize(size);
        this.zoom(scale);

        this.scrollToCenter();
    }

    zoomOutStep() {
        var scale = this.scale();
        for (var i = ZoomSteps.length; i >= 0; --i) {
            var s = ZoomSteps[i];
            if (s < scale) {
                this.zoom(s);
                break;
            }
        }
    }

    zoomInStep() {
        var scale = this.scale();
        for (var i = 0; i < ZoomSteps.length; ++i) {
            var s = ZoomSteps[i];
            if (s > scale) {
                this.zoom(s);
                break;
            }
        }
    }

    maxZoom() {
        return 0.01;
    }

    minZoom() {
        return 16;
    }

    detach() {
    }

    dispose() {
        if (this.context) {
            this.context.dispose();
            this.context = null;
        }
    }
}