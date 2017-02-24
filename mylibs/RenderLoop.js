import DesignerView from "./framework/DesignerView";
import Layer from "./framework/Layer";
import SelectComposite from "./framework/SelectComposite";
import NullPage from "./framework/NullPage";
import DraggingElement from "./framework/interactions/DraggingElement";
import SelectFrame from "./framework/SelectFrame";
import DesignerController from "./framework/DesignerController";
import Environment from "./environment";
import Clipboard from "./framework/Clipboard";
import Keyboard from "./platform/Keyboard";
import Context from "./framework/render/Context";

var doRendering = function(continuous){
    this._renderingRequestId = 0;

    if (continuous){
        this._renderingRequestId = requestAnimationFrame(this._renderingCallbackContinuous);
    }
    this.draw();
};
function redrawCallback(continuous){
    if (continuous && !this._renderingRequestContinuous){
        cancelRedrawCallback.call(this);
    }
    if (!this._renderingRequestId){
        this._renderingRequestId = requestAnimationFrame(continuous ? this._renderingCallbackContinuous : this._renderingCallback);
    }
    this._renderingRequestContinuous = continuous;
}
function cancelRedrawCallback(){
    if (this._renderingRequestId){
        cancelAnimationFrame(this._renderingRequestId);
        this._renderingRequestId = 0;
    }
}

function renderingScheduledCallback(){
    return this._renderingRequestId !== 0;
}

export class RenderLoop {
    init(app, viewContainer, viewport, canvas, middleCanvas, upperCanvas, htmlPanel, htmlLayer){
        this.app = app;
        this.viewContainer = viewContainer;
        this.viewport = viewport;
        this.canvas = canvas;
        this.upperCanvas = upperCanvas;
        this.middleCanvas = middleCanvas;
        this.htmlPanel = htmlPanel;
        this.htmlLayer = htmlLayer;
        this._attached = false;

        this.context = new Context(canvas);
        this.upperContext = new Context(upperCanvas);
        this.middleContext = new Context(middleCanvas);

        this._renderingCallback = function(){
            doRendering.call(this, false);
        }.bind(this);
        this._renderingCallbackContinuous = function(){
            doRendering.call(this, true);
        }.bind(this);

        var devicePixelRatio = window.devicePixelRatio || 1;
        var backingStoreRatio =
            this.context.backingStorePixelRatio ||
            this.context.webkitBackingStorePixelRatio ||
            this.context.mozBackingStorePixelRatio ||
            this.context.msBackingStorePixelRatio ||
            this.context.oBackingStorePixelRatio ||
            1;

        // on some machines it is non integer, it affects rendering
        this.contextScale = 0 | (devicePixelRatio/backingStoreRatio);

        this.attachToView(app);

        // need to do it after next browser relayout
        setTimeout(() =>{
            this.htmlLayerWidth = this.htmlLayer.clientWidth;
            this.htmlLayerHeight = this.htmlLayer.clientHeight;
            if (this.htmlLayerWidth !== this.viewContainer.clientWidth){
                this.viewContainer.scrollLeft = this.htmlLayerWidth/2;
            }
            if (this.htmlLayerHeight !== this.viewContainer.clientHeight){
                this.viewContainer.scrollTop = this.htmlLayerHeight/2;
            }
        }, 0);
    }

    attachToView(app){
        var view = this.view = new DesignerView();
        this.view.setup({Layer, SelectComposite, DraggingElement, SelectFrame});
        this.view.setActivePage(app.activePage);

        this.ensureCanvasSize();
        app.platform.detachEvents();
        app.platform.attachEvents(this.viewContainer);
        Keyboard.attach(document.body);
        view.attachToDOM(this.context, this.upperContext, this.viewContainer, redrawCallback.bind(this), cancelRedrawCallback.bind(this), renderingScheduledCallback.bind(this));
        view.middleContext = this.middleContext;
        var controller = new DesignerController(app, view, {SelectComposite, DraggingElement, SelectFrame});
        Environment.set(view, controller);
        Clipboard.attach(app);
        this._attached = true;

        view.contextScale = this.contextScale;
    }

    draw(){
        if (this.app.isLoaded && this.view && this.view.page != null && this.view.page !== NullPage){
            this.ensureCanvasSize();
            this.app.relayout();
            this.view.draw();
        }
    }

    ensureCanvasSize(){
        var canvas = this.canvas;
        if (!this.view || !canvas || !this._attached){
            return;
        }
        var view = this.view;
        var viewport = this.viewport;

        var scale = view.scale()
            , viewWidth = viewport.clientWidth
            , viewHeight = viewport.clientHeight
            , resized = false;

        if (canvas.width !== (0 | (viewWidth*this.contextScale))){
            canvas.width = viewWidth*this.contextScale;
            canvas.style.width = viewWidth + "px";
            this.upperCanvas.width = viewWidth*this.contextScale;
            this.upperCanvas.style.width = viewWidth + "px";
            this.middleCanvas.width = viewWidth*this.contextScale;
            this.middleCanvas.style.width = viewWidth + "px";
            resized = true;
        }
        if (canvas.height !== (0 | (viewHeight*this.contextScale))){
            canvas.height = viewHeight*this.contextScale;
            canvas.style.height = viewHeight + "px";
            this.upperCanvas.height = viewHeight*this.contextScale;
            this.upperCanvas.style.height = viewHeight + "px";
            this.middleCanvas.height = viewHeight*this.contextScale;
            this.middleCanvas.style.height = viewHeight + "px";
            resized = true;
        }

        this._scale = scale;

        if (resized){
            if (viewWidth && viewHeight){
                view.viewportSizeChanged({width: viewWidth, height: viewHeight});
            }

            view.invalidate();
        }
    }

    //TODO: not bound
    onViewContainerScroll(e){
        if (this._scale !== this.view.scale() || e.target !== this.viewContainer){
            return;
        }
        var cw = this.htmlLayer.clientWidth;
        var ch = this.htmlLayer.clientHeight;
        var viewportWidth = this.viewport.clientWidth;
        var viewportHeight = this.viewport.clientHeight;

        if (viewportWidth != (0 | (cw*1.5)) || viewportHeight != (0 | (ch*1.5))){
            return;
        }

        var width = cw/2;
        var height = ch/2;
        if (this.htmlLayerWidth === cw && this.htmlLayerHeight === ch){

            var dx = e.target.scrollLeft - width;
            var dy = e.target.scrollTop - height;

            this.view.scrollY(this.view.scrollY() + dy, true);
            this.view.scrollX(this.view.scrollX() + dx, true);
        }
        var nw = e.target.scrollLeft = width;
        var nh = e.target.scrollTop = height;

        if (nw === width && nh === height){
            this.htmlLayerWidth = cw;
            this.htmlLayerHeight = ch;
        }
    }
}

export default new RenderLoop();