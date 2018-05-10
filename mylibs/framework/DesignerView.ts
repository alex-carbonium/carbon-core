import { areRectsIntersecting } from "math/math";
import Font from "./Font";
import Brush from "./Brush";
import ViewBase from "framework/ViewBase";
import {SelectionModel, setSelection} from "./SelectionModel";
import Cursor from "framework/Cursor";
import Invalidate from "framework/Invalidate";
import PixelGrid from "framework/render/PixelGrid"
import { IsolationLayer } from "framework/IsolationLayer";
import { LayerType } from "carbon-app";
import { IContext, ContextType } from "carbon-core";
import { SnapController } from "./SnapController";

function setupLayers(Layer) {
    this.interactionLayer = new Layer();
    this.interactionLayer.type = LayerType.Interaction;
    this.interactionLayer.hitTransparent(true);

    this.isolationLayer = new IsolationLayer(this);
    this.isolationLayer.type = LayerType.Isolation;
    this.isolationLayer.hitTransparent(true);
    this.isolationLayer.context = this.isolationContext;

    this._registerLayer(this.isolationLayer);
    this._registerLayer(this.interactionLayer);
    this.interactionLayer.add(this.selection.selectComposite()); // TODO: think how to cut this dependency
    this.interactionLayer.context = this.upperContext;
}

class DesignerView extends ViewBase {
    protected selection:SelectionModel;
    public snapController:SnapController;

    constructor(app) {
        super(app);
        this.snapController = new SnapController(this);
        this.selection = new SelectionModel(this as any);
        setSelection(this.selection);

        this.guideFont = Font.createFromObject({
            family: "Arial",
            size: 8,
            color: Brush.createFromCssColor("red")
        });
        this.guideFontString = Font.cssString(this.guideFont);

        this.pixelGrid = new PixelGrid(this);
        this.showPixelGrid(true);
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

        this._cursorChangedToken = Cursor.changed.bind(this, this.updateCursor);
        this._invalidateRequestedToken = Invalidate.requested.bind(this, this.invalidate);

        if (this.interactionLayer) {
            this.interactionLayer.context = this.upperContext;
        }
    }

    detach() {
        if (this._cursorChangedToken) {
            this._cursorChangedToken.dispose();
            this._cursorChangedToken = null;
        }

        if (this._invalidateRequestedToken) {
            this._invalidateRequestedToken.dispose();
            this._invalidateRequestedToken = null;
        }
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