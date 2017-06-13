import DesignerView from "../DesignerView";
import Layer from "../Layer";
import SelectComposite from "../SelectComposite";
import NullPage from "../NullPage";
import DraggingElement from "../interactions/DraggingElement";
import SelectFrame from "../SelectFrame";
import DesignerController from "../DesignerController";
import Environment from "../../environment";
import Clipboard from "../Clipboard";
import Keyboard from "../../platform/Keyboard";
import Context from "../render/Context";
import ExtensionPoint from "../ExtensionPoint";
import { IApp, IView, IRenderLoop } from "carbon-core";

export default class RenderLoop implements IRenderLoop {
    private _contextScale: number;

    private _context: Context;
    private _upperContext: Context;
    private _gridContext: Context;
    private _isolationContext: Context;

    private _viewport: HTMLElement;
    private _htmlLayer: HTMLElement;
    private _htmlLayerWidth = 0;
    private _htmlLayerHeight = 0;

    private _renderingRequestId = 0;
    private _renderingRequestContinuous = false;

    private _attached = false;
    private _app: IApp;
    private _view: IView;
    private _scale = 0;

    public viewContainer: HTMLElement;

    mount(viewport: HTMLElement, append = false) {
        this.addHtml(viewport, append);

        this._recalculateContextScale();
    }

    unmount() {
        this._attached = false;
        if (this._view) {
            this._view.detach();
        }
        this._app.platform.detachEvents();
        Keyboard.detach(this.viewContainer);
        Clipboard.dispose();
    }

    attachDesignerView(app) {
        if (this._context && !this._attached && this.viewContainer) {
            this._view = new DesignerView(app) as any;
            this._view.contextScale = this._contextScale;

            this.ensureCanvasSize();

            app.platform.detachEvents();
            app.platform.attachEvents(this.viewContainer);
            Keyboard.attach(document.body);

            this._view.attachToDOM(this._context, this._upperContext, this._isolationContext, this.viewContainer, this.redrawCallback, this.cancelRedrawCallback, this.renderingScheduledCallback);
            this._view.setup({Layer, SelectComposite, DraggingElement, SelectFrame});
            this._view.setActivePage(app.activePage);
            this._view.gridContext = this._gridContext;
            this._view.contextScale = this._contextScale;

            var controller = new DesignerController(app, this._view, {SelectComposite, DraggingElement, SelectFrame});

            Environment.set(this._view, controller);
            Clipboard.attach(app);

            this._app = app;
            this._attached = true;

            // need to do it after next browser relayout
            setTimeout(() => {
                this._htmlLayerWidth = this._htmlLayer.clientWidth;
                this._htmlLayerHeight = this._htmlLayer.clientHeight;
                if (this._htmlLayerWidth !== this.viewContainer.clientWidth) {
                    this.viewContainer.scrollLeft = this._htmlLayerWidth / 2;
                }
                if (this._htmlLayerHeight !== this.viewContainer.clientHeight) {
                    this.viewContainer.scrollTop = this._htmlLayerHeight / 2;
                }
            }, 0);
        }
    }

    isAttached() {
        return this._attached;
    }

    private addHtml(viewport: HTMLElement, append: boolean) {
        let viewContainer = document.createElement("div");
        viewContainer.id = "viewContainer";
        viewContainer.tabIndex = 1;
        viewContainer.onscroll = this.onViewContainerScroll;
        viewContainer.style.position = "relative";
        viewContainer.style.width = '150%';
        viewContainer.style.height = '150%';
        viewContainer.style.overflow = "scroll";
        viewContainer.style.background = "none repeat scroll 0 0 transparent";

        let htmlLayer = document.createElement("div");
        htmlLayer.id = "htmlLayer";
        this.setAbsolutePosition(htmlLayer);
        htmlLayer.style.pointerEvents = "none";
        htmlLayer.style.width = '150%';
        htmlLayer.style.height = '150%';
        viewContainer.appendChild(htmlLayer);

        let htmlPanel = document.createElement("div");
        htmlPanel.id = "htmlPanel";
        htmlPanel.tabIndex = 1;
        this.setAbsolutePosition(htmlPanel);
        htmlPanel.style.pointerEvents = "none";
        viewContainer.appendChild(htmlPanel);

        if (append) {
            viewport.appendChild(viewContainer);
        }
        else {
            viewport.insertBefore(viewContainer, viewport.firstChild);
        }

        this.viewContainer = viewContainer;
        this._viewport = viewport;
        this._htmlLayer = htmlLayer;

        this._upperContext = this.addCanvas(viewport, "app_upperCanvas", append);
        this._isolationContext = this.addCanvas(viewport, "isolation_canvas", append);
        this._gridContext = this.addCanvas(viewport, "grid_canvas", append);
        this._context = this.addCanvas(viewport, "app_canvas", append);
    }

    private addCanvas(parent: HTMLElement, id: string, append: boolean) {
        let canvas = document.createElement("canvas");
        canvas.id = id;
        this.setAbsolutePosition(canvas);

        if (append) {
            parent.appendChild(canvas);
        }
        else {
            parent.insertBefore(canvas, parent.firstChild);
        }

        return new Context(canvas);
    }

    private setAbsolutePosition(node: HTMLElement) {
        node.style.position = "absolute";
        node.style.left = "0";
        node.style.top = "0";
    }

    private _renderingCallback = () => {
        this.doRendering(false);
    }
    private _renderingCallbackContinuous = () => {
        this.doRendering(true);
    }

    private doRendering(continuous) {
        this._renderingRequestId = 0;

        if (continuous) {
            this._renderingRequestId = requestAnimationFrame(this._renderingCallbackContinuous);
        }
        this.draw();
    }
    private redrawCallback = (continuous) => {
        if (continuous && !this._renderingRequestContinuous) {
            this.cancelRedrawCallback();
        }
        if (!this._renderingRequestId) {
            this._renderingRequestId = requestAnimationFrame(continuous ? this._renderingCallbackContinuous : this._renderingCallback);
        }
        this._renderingRequestContinuous = continuous;
    }
    private cancelRedrawCallback = () => {
        if (this._renderingRequestId) {
            cancelAnimationFrame(this._renderingRequestId);
            this._renderingRequestId = 0;
        }
    }
    private renderingScheduledCallback = () => {
        return this._renderingRequestId !== 0;
    }

    private draw() {
        if (this._attached && this._app.isLoaded && this._view && this._view.page && this._view.page !== NullPage) {
            this.ensureCanvasSize();
            this._app.relayout();
            this._view.draw();
        }
    }

    private onViewContainerScroll = e => {
        if (this._scale !== this._view.scale() || e.target !== this.viewContainer) {
            return;
        }
        var cw = this._htmlLayer.clientWidth;
        var ch = this._htmlLayer.clientHeight;
        var viewportWidth = this._viewport.clientWidth;
        var viewportHeight = this._viewport.clientHeight;
        var view = this._view;

        if (viewportWidth != (0 | (cw * 1.5)) || viewportHeight != (0 | (ch * 1.5))) {
            return;
        }

        var width = cw / 2;
        var height = ch / 2;
        if (this._htmlLayerWidth === cw && this._htmlLayerHeight === ch) {

            var dx = e.target.scrollLeft - width;
            var dy = e.target.scrollTop - height;

            view.scrollY(view.scrollY() + dy);
            view.scrollX(view.scrollX() + dx);
        }
        var nw = e.target.scrollLeft = width;
        var nh = e.target.scrollTop = height;

        if (nw === width && nh === height) {
            this._htmlLayerWidth = cw;
            this._htmlLayerHeight = ch;
        }
    }

    private _recalculateContextScale() {
        var devicePixelRatio = window.devicePixelRatio || 1;
        var backingStoreRatio =
            this._context.backingStorePixelRatio ||
            this._context.webkitBackingStorePixelRatio ||
            this._context.mozBackingStorePixelRatio ||
            this._context.msBackingStorePixelRatio ||
            this._context.oBackingStorePixelRatio ||
            1;

        // on some machines it is non integer, it affects rendering
        // browser zoom is also changing this value, so need to make sure it is never 0
        this._contextScale = Math.max(1, Math.round(devicePixelRatio / backingStoreRatio));
        if (this._view) {
            this._view.contextScale = this._contextScale;
        }
    }

    private ensureCanvasSize() {
        if (!this._view || !this._context || !this._attached) {
            return;
        }
        var view = this._view;
        var viewport = this._viewport;
        var canvas = this._context.canvas;
        var upperCanvas = this._upperContext.canvas;
        var gridCanvas = this._gridContext.canvas;
        var isolationCanvas = this._isolationContext.canvas;

        this._recalculateContextScale();

        var scale = view.scale()
            , viewWidth = viewport.clientWidth
            , viewHeight = viewport.clientHeight
            , resized = false;

        if (canvas.width !== (0 | (viewWidth * this._contextScale))) {
            canvas.width = viewWidth * this._contextScale;
            canvas.style.width = viewWidth + "px";
            upperCanvas.width = viewWidth * this._contextScale;
            upperCanvas.style.width = viewWidth + "px";
            gridCanvas.width = viewWidth * this._contextScale;
            gridCanvas.style.width = viewWidth + "px";
            isolationCanvas.width = viewWidth * this._contextScale;
            isolationCanvas.style.width = viewWidth + "px";
            resized = true;
        }
        if (canvas.height !== (0 | (viewHeight * this._contextScale))) {
            canvas.height = viewHeight * this._contextScale;
            canvas.style.height = viewHeight + "px";
            upperCanvas.height = viewHeight * this._contextScale;
            upperCanvas.style.height = viewHeight + "px";
            gridCanvas.height = viewHeight * this._contextScale;
            gridCanvas.style.height = viewHeight + "px";
            isolationCanvas.height = viewHeight * this._contextScale;
            isolationCanvas.style.height = viewHeight + "px";
            resized = true;
        }

        this._scale = scale;

        if (resized) {
            if (viewWidth && viewHeight) {
                view.viewportSizeChanged({width: viewWidth, height: viewHeight});
            }

            view.invalidate();
        }
    }
}