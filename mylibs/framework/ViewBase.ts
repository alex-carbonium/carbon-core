import AnimationController from "framework/animation/AnimationController";
import { areRectsIntersecting } from "math/math";
import Matrix from "math/matrix";
import ContextPool from "framework/render/ContextPool";
import EventHelper from "framework/EventHelper";
import Selection from "framework/SelectionModel";
import Invalidate from "framework/Invalidate";
import { LayerTypes, IView, IAnimationController, ILayer, IUIElement, ViewState, IEvent, ICoordinate } from "carbon-core";
import Rect from "../math/rect";
import AnimationGroup from "./animation/AnimationGroup";

var Stopwatch = require("../Stopwatch");
var debug = require("DebugUtil")("carb:view");

const ZoomSteps = [0.02, 0.03, 0.06, 0.13, 0.25, 0.5, 1, 2, 4, 8, 16, 32, 64, 128, 256];

function setupLayers(Layer) {
    var layer = new Layer(this);
    this._page = layer;

    this._registerLayer(layer);
}

function setupLayer(layer, context) {
    context.scale(this.contextScale, this.contextScale);

    layer.clearContext(context);

    if (this._globalContextModifier) {
        this._globalContextModifier(context);
    }
    else {
        if (layer.pageMatrix) {
            layer.pageMatrix.applyToContext(context);
        }
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
        var viewport = this.app.viewportSize();
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

    private _viewState: ViewState = {scale: 0, sx: 0, sy: 0};

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

    _drawLayer(layer, context, environment) {
        this.stopwatch.start();
        context.save();
        setupLayer.call(this, layer, context);
        layer.draw(context, environment);

        var subscribers = this._registredForLayerDraw[layer.type];
        for (var i = 0; i < subscribers.length; ++i) {
            subscribers[i].onLayerDraw(layer, context, environment);
        }

        context.restore();
        debug("layer %d, metrics: %d", layer.type, this.stopwatch.getElapsedTime())
    }

    _drawLayerPixelsVisible(scale) {
        var viewportSize = this.app.viewportSize();
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
        let env: any = layer.env;

        if (!env) {
            let setupLayerHandler = setupLayer.bind(this);
            env = layer.env = {
                layer: layer,
                setupContext: function (context) {
                    setupLayerHandler(this.layer, context);
                }
            };
        }

        env.pageMatrix = layer.pageMatrix;
        env.finalRender = final;
        env.view = this;
        env.contextScale = this.contextScale;
        env.showFrames = this.app.showFrames();
        return env;
    }


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

    setup(deps) {
        this.deps = deps;
        setupLayers.call(this, deps.Layer);
    }

    renderingScheduled() {
        return this._renderingScheduledCallback && this._renderingScheduledCallback();
    }

    setupRendering(context, requestRedrawCallback, cancelRedrawCallback, renderingScheduledCallback) {
        this.context = context;

        this._requestRedrawCallback = requestRedrawCallback;
        this._renderingScheduledCallback = renderingScheduledCallback;
        if (this.animationController) {
            this.animationController.setCallbacks(requestRedrawCallback, cancelRedrawCallback);
        } else {
            this.animationController = new AnimationController(requestRedrawCallback, cancelRedrawCallback);
        }

        this.requestRedraw();
    }

    registerGlobalContextModifier(modifier) {
        this._globalContextModifier = modifier;
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
        var size = this.app.viewportSize();
        page.zoomToFit(size);
        var scale = page.scale();
        page.scale(1);
        var scroll = page.scrollCenterPosition(size);
        page.scrollTo(scroll);

        delete page._placeBeforeRender;
        this.zoom(scale);
        this.app.actionManager.invoke("refreshZoom");
    }

    draw() {
        this.animationController.update();

        if (this._page.isInvalidateRequired()) {
            if (this._page._placeBeforeRender) {
                this.setInitialPagePlace(this._page);
            }

            var scale = this.scale();
            if (scale > 1 && this.showPixels()) {
                this._drawLayerPixelsVisible(scale);
            } else {
                let env = this._getEnv(this._page, true);
                this._drawLayer(this._page, this.context, env);
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

    scale(value?) {
        var page = this.page;
        if (!page) {
            return 1;
        }

        var pageScale = page.scale();
        if (arguments.length) {
            if (value !== pageScale) {
                pageScale = page.scale(value);
                this.scaleChanged.raise(pageScale);
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
        page.type = LayerTypes.Content;
        this.activateLayer(page.type);

        this.scale(page.scale());
    }

    global2local(/*Point*/pos) {
        return pos;
    }

    local2global(/*Point*/pos) {
        return pos;
    }

    getLayer(layerType: LayerTypes): ILayer {
        return this._layers.find(l => l.type === layerType);
    }

    activateLayer(layerType: LayerTypes, silent?: boolean){
        var layer = this.getLayer(layerType);

        if (layer !== this.activeLayer){
            if (this.activeLayer){
                this.activeLayer.deactivate();
                this.activeLayer.isActive = false;
            }
            layer.isActive = true;
            this.activeLayer = layer;
            if (!silent){
                this.activeLayerChanged.raise(layer);
            }
        }
    }

    deactivateLayer(layerType: LayerTypes, silent?: boolean){
        var i = this._layers.findIndex(x => x.type === layerType);
        if (i){
            this.activateLayer(this._layers[i - 1].type, silent);
        }
    }

    viewportRect() {
        var size = this.app.viewportSize();
        var scale = this.scale();
        return new Rect(
            this.scrollX() / scale,
            this.scrollY() / scale,
            size.width / scale,
            size.height / scale
        );
    }

    get viewState(): ViewState {
        var sx = this.scrollX();
        var sy = this.scrollY();
        var scale = this.scale();

        if (sx !== this._viewState.sx || sy !== this._viewState.sy || scale !== this._viewState.scale) {
            this._viewState = {sx, sy, scale};
        }

        return this._viewState;
    }

    ensureViewState(newState: ViewState) {
        if (newState === this.viewState) {
            return;
        }

        var animationValues = [];
        var options = {duration:180};

        animationValues.push({ from: this.scrollX(), to: newState.sx, accessor: value => {
            if(arguments.length === 1) {
                return this.scrollX(value);
            }

            return this.scrollX();
        } });

        animationValues.push({ from: this.scrollY(), to: newState.sy, accessor: value => {
            if(arguments.length === 1) {
                return this.scrollY(value);
            }

            return this.scrollY();
        } });

        animationValues.push({ from: this.scale(), to: newState.scale, accessor: value => {
            if(arguments.length === 1) {
                return this.scale(value);
            }

            return this.scale();
        } });

        var group = new AnimationGroup(animationValues, options, () => {
            Invalidate.request();
        });

        this.animationController.registerAnimationGroup(group);
    }

    pointToScreen(point: ICoordinate) {
        var parentOffset = this.app.platform.containerOffset();
        return {
            x: parentOffset.left + point.x - this.page.scrollX(),
            y: parentOffset.top + point.y - this.page.scrollY()
        };
    }

    invalidate(layerType?, rect?) {
        //rect = rect || this.viewportRect();
        if (layerType === undefined) {
            for (var i = 0; i < this._layers.length; i++) {
                this._layers[i].invalidate(false, rect);
            }
        }
        else {
            var layer = this._layers.find(l => l.type === layerType);
            if (layer) {
                layer.invalidate(false, rect);
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

    scrollX(value?) {
        var page = this.page;
        if (!page) {
            return 0;
        }

        if (value !== undefined) {

            value = ~~value;
            if (page.scrollX() !== value) {
                page.scrollX(value);
                this.invalidate();
            }
        }

        return page.scrollX();
    }

    scrollY(value?) {
        var page = this.page;
        if (!page) {
            return 0;
        }

        if (value !== undefined) {
            value = ~~value;
            if (page.scrollY() !== value) {
                page.scrollY(value);
                this.invalidate();
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

    ensureVisible(element) {
        var pt = element.getBoundaryRectGlobal();
        pt = { x: pt.x + pt.width / 2, y: pt.y + pt.height / 2 };
        var scroll = this.page.pointToScroll(pt, this.app.viewportSize());
        if (scroll.scrollX) {
            this.scrollX(scroll.scrollX);
        }

        if (scroll.scrollY) {
            this.scrollY(scroll.scrollY);
        }
    }

    ensureScale(element) {
        var rect = element.getBoundaryRectGlobal();
        var size = this.app.viewportSize();
        var w = rect.width * 2;
        var h = rect.height * 2;
        var sx = size.width / w;
        var sy = size.height / h;
        this.scale(Math.min(sx, sy));
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

    scrollCenterPosition() {
        return this.page.scrollCenterPosition(this.app.viewportSize(), this.scale());
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
            if (!layer.hitTransparent() && layer.canAccept(element)) {
                layer.dropToLayer(x, y, element);
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

    toDataURL(type) {
        this.context.canvas.toDataURL(type);
    }

    viewportSizeChanged(newSize) {
        if (this._oldSize) {
            var oldSize = this._oldSize;
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
        this._oldSize = newSize;
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
        var size = this.app.viewportSize();

        this.app.activePage.zoomToFit(size);
        this.zoom(this.app.activePage.scale());

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
}