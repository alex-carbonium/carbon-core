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

    private _contexts: Context[];
    private _context: Context;
    private _upperContext: Context;
    private _gridContext: Context;
    private _isolationContext: Context;

    private _viewport: HTMLElement;

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

            this._view.attachToDOM(this._contexts, this._upperContext, this._isolationContext, this.viewContainer, this.redrawCallback, this.cancelRedrawCallback, this.renderingScheduledCallback);
            this._view.setup({ Layer, SelectComposite, DraggingElement, SelectFrame });
            this._view.setActivePage(app.activePage);
            this._view.gridContext = this._gridContext;
            this._view.contextScale = this._contextScale;

            var controller = new DesignerController(app, this._view, { SelectComposite, DraggingElement, SelectFrame });

            Environment.set(this._view, controller);
            Clipboard.attach(app);

            this._app = app;
            this._attached = true;
        }
    }

    isAttached() {
        return this._attached;
    }

    private addHtml(viewport: HTMLElement, append: boolean) {
        let viewContainer = document.createElement("div");
        viewContainer.id = "viewContainer";
        viewContainer.tabIndex = 1;
        viewContainer.style.position = "relative";
        viewContainer.style.width = '100%';
        viewContainer.style.height = '100%';
        viewContainer.style.overflow = "scroll";
        viewContainer.style.background = "none repeat scroll 0 0 transparent";

        if (append) {
            viewport.appendChild(viewContainer);
        }
        else {
            viewport.insertBefore(viewContainer, viewport.firstChild);
        }

        this.viewContainer = viewContainer;
        this._viewport = viewport;

        this._upperContext = this.addCanvas(viewport, "app_upperCanvas", append);
        this._isolationContext = this.addCanvas(viewport, "isolation_canvas", append);
        this._gridContext = this.addCanvas(viewport, "grid_canvas", append);
        this._contexts = [];
        var c3 = this.addCanvas(viewport, "app_canvas3", append);
        var c2 = this.addCanvas(viewport, "app_canvas2", append);

        this._context = this.addCanvas(viewport, "app_canvas1", append);
        this._contexts.push(this._context);
        this._contexts.push(c2);
        this._contexts.push(c3);
        this._contexts.push(this._upperContext);
        this._contexts.push(this._isolationContext);
        this._contexts.push(this._gridContext);
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
        var context = this._contexts[0];
        var canvas = context.canvas;

        this._recalculateContextScale();

        var scale = view.scale()
            , viewWidth = viewport.clientWidth
            , viewHeight = viewport.clientHeight
            , resized = false;

        if (canvas.width !== (0 | (viewWidth * this._contextScale))) {
            for (let ctx of this._contexts) {
                let canvas = ctx.canvas;
                ctx.width = viewWidth * this._contextScale;
                canvas.style.width = viewWidth + "px";
            }

            resized = true;
        }

        if (canvas.height !== (0 | (viewHeight * this._contextScale))) {
            for (let ctx of this._contexts) {
                let canvas = ctx.canvas;
                ctx.height = viewHeight * this._contextScale;
                canvas.style.height = viewHeight + "px";
            }
            resized = true;
        }

        this._scale = scale;

        if (resized) {
            if (viewWidth && viewHeight) {
                view.updateViewportSize({ width: viewWidth, height: viewHeight });
            }

            view.invalidate();
        }
    }
}