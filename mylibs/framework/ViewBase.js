import AnimationController from "framework/animation/AnimationController";
import {areRectsIntersecting} from "math/math";
import Matrix from "math/matrix";
import ContextPool from "framework/render/ContextPool";
import EventHelper from "framework/EventHelper";
import Selection from "framework/SelectionModel";
import Invalidate from "framework/Invalidate";
var Stopwatch = require("../Stopwatch");
var debug = require("DebugUtil")("carb:view");

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

        var viewport = App.Current.viewportSize();
        var scale = view.scale();
        sx /= scale;
        sy /= scale;
        sx += (viewport.width / scale) / 2;
        sy += (viewport.height / scale) / 2;
        view.scale(value);
        var scroll = App.Current.activePage.pointToScroll({x: sx, y: sy}, viewport);

        view.scrollX(scroll.scrollX);
        view.scrollY(scroll.scrollY);
    }

    Invalidate.request();
}


export default class ViewBase {

    _registerLayer(layer) {
        this._layers.push(layer);
        this._layersReverse.splice(0, 0, layer);
        layer._view = this;

        var setupLayerHandler = setupLayer.bind(this);

        this._envArray.push({
            finalRender: true,
            pageMatrix: null,
            layer: layer,
            setupContext: function (context) {
                setupLayerHandler(this.layer, context);
            },
            view: this
        });

    }

    _unregisterLayer(layer){
        var i = this._layers.findIndex(l=>l===layer);
        if(i >= 0){
            this._layers.splice(i,1);
        }

        i = this._layersReverse.findIndex(l=>l===layer);
        if(i >= 0){
            this._layersReverse.splice(i,1);
        }

        i = this._envArray.findIndex(l=>l.layer===layer);
        if(i >= 0){
            this._envArray.splice(i,1);
        }
    }

    _drawLayer(layer, layerIndex, context, environment) {
        this.stopwatch.start();
        context.save();
        setupLayer.call(this, layer, context);
        layer.draw(context, environment);

        var subscribers = this._registredForLayerDraw[layerIndex];
        for (var i = 0; i < subscribers.length; ++i) {
            subscribers[i].onLayerDraw(layerIndex, context, environment);
        }
        context.restore();
        debug("layer %d, metrics: %d", layerIndex, this.stopwatch.getElapsedTime())
    }

    _drawLayerPixelsVisible(scale) {
        var viewportSize = App.Current.viewportSize();
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

        let env = this._getEnv(this._page, 1, true);
        this._drawLayer(this._page, 1, context, env);

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

    _getEnv(layer:any, layerIndex:number, final:boolean) {
        let env = this._envArray[layerIndex - 1];

        env.pageMatrix = layer.pageMatrix;
        env.finalRender = final;
        env.view = this;
        env.contextScale = this.contextScale;
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
        this._layersReverse = [];
        this._envArray = [];
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

    registerForLayerDraw(layer, element, index) {
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
        var size = App.Current.viewportSize();
        page.zoomToFit(size);
        var scale =  page.scale();
        page.scale(1);
        var scroll = page.scrollCenterPosition(size);
        page.scrollTo(scroll);

        delete page._placeBeforeRender;
        this.zoom(scale);
        App.Current.actionManager.invoke("refreshZoom");
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
                let env = this._getEnv(this._page, 1, true);
                this._drawLayer(this._page, 1, this.context, env);
            }
        }

        for(var i = 1; i < this._layers.length; ++i) {
            var layer = this._layers[i];
            if (layer.isInvalidateRequired()) {
                layer.pageMatrix = this._page.pageMatrix;
                let env = this._getEnv(layer, i + 1, false);
                this._drawLayer(layer, i+1, layer.context, env);
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

    showPixels(value) {
        if (value !== undefined) {
            this._showPixels = value;
        }
        return this._showPixels;
    }

    scale(value) {
        var page = this.page;
        if (!page) {
            return 1;
        }

        var pageScale = page.scale();
        if (arguments.length){
            if (value !== pageScale){
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
        this._layersReverse[1] = page;
        this._envArray[0].layer = page;

        page.parent(this);
        this.scale(page.scale());
    }

    global2local(/*Point*/pos) {
        return pos;
    }

    local2global(/*Point*/pos) {
        return pos;
    }

    viewportRect() {
        var size = App.Current.viewportSize();
        var scale = this.scale();
        return {
            x: this.scrollX() / scale,
            y: this.scrollY() / scale,
            width: size.width / scale,
            height: size.height / scale
        };
    }

    invalidate(layer, rect) {
        //rect = rect || this.viewportRect();
        if (layer === undefined) {
            for (var i = 0; i < this._layers.length; i++) {
                this._layers[i].invalidate(false, rect);
            }
        }
        else {
            this._layers[layer].invalidate(false, rect);
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

    scrollX(value) {
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

    scrollY(value) {
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
        pt = {x: pt.x + pt.width / 2, y: pt.y + pt.height / 2};
        var scroll = this.page.pointToScroll(pt, App.Current.viewportSize());
        if (scroll.scrollX) {
            this.scrollX(scroll.scrollX);
        }

        if (scroll.scrollY) {
            this.scrollY(scroll.scrollY);
        }
    }

    ensureScale(element) {
        var rect = element.getBoundaryRectGlobal();
        var size = App.Current.viewportSize();
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
        return this.page.scrollCenterPosition(App.Current.viewportSize(), this.scale());
    }

    scrollPosition() {
        return {scrollX: this.scrollX(), scrollY: this.scrollY()};
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
            var scroll = App.Current.activePage.pointToScroll({x: sx, y: sy}, newSize);

            this.scrollX(scroll.scrollX);
            this.scrollY(scroll.scrollY);
        }
        this._oldSize = newSize;
    }

    showContextMenu(eventData) {

    }

    cancel() {
    }

    zoom (value, norefresh) {
        if(value !== undefined) {
            if(!norefresh && (this.scale() !== value)){
                onZoomChanged.call(this, value, this.scale());
            }
        }
        return this.scale();
    }
    zoomToFit () {
        var size = App.Current.viewportSize();

        App.Current.activePage.zoomToFit(size);
        this.zoom(App.Current.activePage.scale());

        this.scrollToCenter();
    }
    maxZoom () {
        return 0.01;;
    }
    minZoom () {
        return 16;
    }
}