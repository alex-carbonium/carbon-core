import DesignerView from "../DesignerView";
import Layer from "../Layer";
import SelectComposite from "../SelectComposite";
import NullPage from "../NullPage";
import { SelectFrame } from "../SelectFrame";
import DesignerController from "../DesignerController";
import Workspace from "../../Workspace";
import Clipboard from "../Clipboard";
import { keyboard } from "../../platform/Keyboard";
import Context from "../render/Context";
import ExtensionPoint from "../ExtensionPoint";
import { IApp, IView, IRenderLoop, IController, ContextType, Platform, IPlatformSpecificHandler } from "carbon-core";
import MirroringController from "../MirroringController";
import { createPlatformHandler } from "../../platform/PlatformSpecificHandler";


export default class RenderLoop implements IRenderLoop {
    private _contextScale: number = 1;
    private _contexts: Context[] = null;
    private _viewport: HTMLElement = null;

    private _renderingRequestId = 0;
    private _renderingRequestContinuous = false;

    private _attached = false;
    private _app: IApp = null;
    private _view: IView = null;
    private _controller: IController = null;
    private _scale = 0;

    private _suspended = false;

    public viewContainer: HTMLElement;



    mountDesignerView(app: IApp, viewport: HTMLElement, append = false) {
        let html = this.addDesignerHtml(viewport, append);

        let view = this._view;
        if(!view) {
            view = new DesignerView(app) as any;
        }

        view.attachToDOM(this._contexts, this.viewContainer, this.redrawCallback, this.cancelRedrawCallback, this.renderingScheduledCallback);
        view.setup({ Layer, SelectComposite, SelectFrame });
        view.setActivePage(app.activePage);
        view.gridContext = html.gridContext;

        let controller = this._controller;
        if(!controller)
        {
            controller = new DesignerController(app, view);
        }

        this.finishMounting(app, view, controller);
    }
    platformHandler:IPlatformSpecificHandler;
    private finishMounting(app: IApp, view: IView, controller: IController) {
        this.platformHandler = createPlatformHandler();
        this.platformHandler.attachEvents(this.viewContainer, app, view, controller);

        Clipboard.attach(app, view, controller);
        keyboard.attach();

        this._app = app;
        this._view = view;
        this._controller = controller;
        this._attached = true;
        (view as any).controller = controller;

        this.ensureCanvasSize();
    }

    unmount() {
        this._attached = false;
        if (this._view) {
            this._view.detach();
        }
        this.platformHandler.detachEvents();
        this.platformHandler.dispose();
        keyboard.detach();
        Clipboard.dispose();
    }

    isAttached() {
        return this._attached;
    }

    get view() {
        return this._view;
    }

    get controller() {
        return this._controller;
    }

    private addDesignerHtml(viewport: HTMLElement, append: boolean) {
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

        let upperContext = this.addCanvas(ContextType.Interaction, viewport, "app_upperCanvas", append);
        let isolationContext = this.addCanvas(ContextType.Isolation, viewport, "isolation_canvas", append);
        let gridContext = this.addCanvas(ContextType.Grid, viewport, "grid_canvas", append);
        this._contexts = [];
        var c3 = this.addCanvas(ContextType.Content, viewport, "app_canvas3", append);
        var c2 = this.addCanvas(ContextType.Content, viewport, "app_canvas2", append);

        let context = this.addCanvas(ContextType.Content, viewport, "app_canvas1", append);
        this._contexts.push(context);
        this._contexts.push(c2);
        this._contexts.push(c3);
        this._contexts.push(upperContext);
        this._contexts.push(isolationContext);
        this._contexts.push(gridContext);

        return { context, upperContext, gridContext, isolationContext };
    }

    private addCanvas(type: ContextType, parent: HTMLElement, id: string, append: boolean) {
        let canvas = document.createElement("canvas");
        canvas.id = id;
        this.setAbsolutePosition(canvas);

        if (append) {
            parent.appendChild(canvas);
        }
        else {
            parent.insertBefore(canvas, parent.firstChild);
        }

        return new Context(type, canvas);
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
        if (this._suspended) {
            return;
        }

        try {
            if (this._attached && this._app.isLoaded && this._view && this._view.page && this._view.page !== NullPage) {
                this.ensureCanvasSize();
                this._app.relayout();
                this._view.draw();
            }
        }
        catch (e) {
            this._suspended = true;
            Workspace.reportFatalErrorAndRethrow(e);
        }
    }

    private recalculateContextScale(context) {
        var dpr = devicePixelRatio || 1;
        var backingStoreRatio =
            context.backingStorePixelRatio ||
            context.webkitBackingStorePixelRatio ||
            context.mozBackingStorePixelRatio ||
            context.msBackingStorePixelRatio ||
            context.oBackingStorePixelRatio ||
            1;

        // on some machines it is non integer, it affects rendering
        // browser zoom is also changing this value, so need to make sure it is never 0
        this._contextScale = Math.max(1, Math.round(dpr / backingStoreRatio));
        if (this._view) {
            this._view.contextScale = this._contextScale;
        }
    }

    private ensureCanvasSize() {
        if (!this._view || !this._contexts || !this._attached) {
            return;
        }
        var view = this._view;
        var viewport = this._viewport;
        var context = this._contexts[0];
        var canvas = context.canvas;

        this.recalculateContextScale(context);

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