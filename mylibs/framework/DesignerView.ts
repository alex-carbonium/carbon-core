import { areRectsIntersecting } from "math/math";
import Font from "./Font";
import Brush from "./Brush";
import ViewBase from "framework/ViewBase";
import Cursor from "framework/Cursor";
import Invalidate from "framework/Invalidate";
import PixelGrid from "framework/render/PixelGrid"
import { IsolationLayer } from "framework/IsolationLayer";
import { LayerType, IApp, IController } from "carbon-app";
import { IContext, ContextType, IDisposable } from "carbon-core";
import { SnapController } from "./SnapController";
import { ViewStateStack } from "../framework/ViewStateStack";

function setupLayers(Layer) {
    this.interactionLayer = new Layer();
    this.interactionLayer.type = LayerType.Interaction;
    this.interactionLayer.hitTransparent(true);
    this.interactionLayer.context = this.upperContext;

    this.isolationLayer = new IsolationLayer(this);
    this.isolationLayer.type = LayerType.Isolation;
    this.isolationLayer.hitTransparent(true);
    this.isolationLayer.context = this.isolationContext;

    this._registerLayer(this.isolationLayer);
    this._registerLayer(this.interactionLayer);
}

class DesignerView extends ViewBase {
    public snapController: SnapController;
    private viewStateStack: ViewStateStack;
    private attachedDisposables:IDisposable[] = [];
    public controller:IController;

    constructor(private app: IApp) {
        super(app);
        this.snapController = new SnapController(this);

        this.guideFont = Font.createFromObject({
            family: "Arial",
            size: 8,
            color: Brush.createFromCssColor("red")
        });
        this.guideFontString = Font.cssString(this.guideFont);

        this.pixelGrid = new PixelGrid(this);
        this.showPixelGrid(true);
        this.viewStateStack = new ViewStateStack(this.app, this);
    }

    setup(deps) {
        super.setup(deps);
        setupLayers.call(this, deps.Layer);
    }

    attachToDOM(contexts: IContext[], viewContainerElement, requestRedrawCallback, cancelRedrawCallback, renderingScheduledCallback) {
        this.viewContainerElement = viewContainerElement; // parent div element
        this.upperContext = contexts.find(x => x.type === ContextType.Interaction);
        this.isolationContext = contexts.find(x => x.type === ContextType.Isolation);

        this.setupRendering(contexts, requestRedrawCallback, cancelRedrawCallback, renderingScheduledCallback);

        this.attachedDisposables.push(Cursor.changed.bind(this, this.updateCursor));
        this.attachedDisposables.push(Invalidate.requested.bind(this, this.invalidate));
        this.attachedDisposables.push(Invalidate.requestedViewRedraw.bind(this, this.requestRedraw));

        if (this.interactionLayer) {
            this.interactionLayer.context = this.upperContext;
        }
        this.viewStateStack.attach();

        let page:any = this.app.activePage;
        this.onActivePageChanged(null, page);
        this.attachedDisposables.push(this.app.pageChanging.bind(this, this.onActivePageChanged));
    }

    onActivePageChanged(oldPage, newPage) {
        this.setActivePage(newPage);
        this.zoom(newPage.pageScale(), true);
    }

    detach() {
        this.attachedDisposables.forEach(d=>d.dispose());
        this.attachedDisposables.length = 0;

        this.viewStateStack.detach();
    }

    draw() {
        super.draw.apply(this, arguments);
        if (this.showPixelGrid()) {
            this.pixelGrid.updateGrid();
        }
    }

    showPixelGrid(value?) {
        if (value !== undefined) {
            if (this._pixelGrid !== value && !value) {
                this.pixelGrid.clear();
            }
            this._pixelGrid = value;
        }
        return this._pixelGrid;
    }

    focus() {
        this.viewContainerElement.focus();
        this.invalidate();
    }

    prototyping(value?) {
        if (value !== undefined) {
            this._prototyping = value;
        }

        return this._prototyping;
    }

    applyGuideFont(context) {
        context.font = this.guideFontString;
        Brush.fill(this.guideFont.color, context);
    }

    addHtmlElement(/*HtmlElement*/element) {
        this.viewContainerElement.appendChild(element);
    }

    removeHtmlElement(/*HtmlElement*/element) {
        this.viewContainerElement.removeChild(element);
    }


    updateCursor(value, oldValue) {
        if (this.viewContainerElement) {
            if (oldValue) {
                this.viewContainerElement.classList.remove("c-" + oldValue);
            }
            if (value) {
                this.viewContainerElement.classList.add("c-" + value);
            }
        }
    }
}


export default DesignerView;