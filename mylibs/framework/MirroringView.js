import ViewBase from "./ViewBase"
import Environment from "environment";
import Invalidate from "framework/Invalidate"
import Page from "framework/Page";
import {ChangeMode} from "framework/Defs";
import PropertyMetadata from "framework/PropertyMetadata";

function fitRectToRect(outer, inner) {
    var scale = outer.width / inner.width;

    var newHeight = inner.height * scale;
    if (newHeight > outer.height) {
        scale = outer.height / inner.height;
    }

    return scale;
}

class ArtboardProxyPage extends Page {
    constructor(app, view){
        super();
        this.view = view;
        this._pageChnagedToken = null;
        this._onArtboardChangedToken = null;

        this._pageChnagedToken = app.pageChanged.bind(this, ()=>{
            if(this._onArtboardChangedToken){
                this._onArtboardChangedToken.dispose();
            }
            this._onArtboardChanged(app.activePage.getActiveArtboard());
            this._onArtboardChangedToken = Environment.controller.onArtboardChanged.bind(this, ()=>this._onArtboardChanged)
        });

        view.scaleChanged.bind(()=>{
            this.updateScrollRanges();
        })

        this._version = null;
        this._sX = null;
        this._sY = null;
        this._ss = null;
        this.minScrollX(0);
        this.minScrollY(0);
    }

    _onArtboardChanged(artboard){
        this._artboard = artboard;
        if(artboard) {
            this.children = [artboard];
            artboard.setProps({x:0, y:0}, ChangeMode.Self);
            this.width(artboard.width());
            this.height(artboard.height());

            this.updateScrollRanges();
        }
        this._version = null;
        this.view.setActivePage(this);

        this.fitToViewport();
    }

    updateScrollRanges(){
        var artboard = this.children[0];
        if(!artboard){
            return;
        }
        var screenSize = App.Current.viewportSize();
        var scale = this.view.scale();
        this.maxScrollX(Math.max(0, (artboard.width() - screenSize.width) * scale));
        this.maxScrollY(Math.max(0, (artboard.height() - screenSize.height) * scale));
    }

    fitToViewport(){
        var rect = this.view.page.children[0].getBoundaryRect();
        var scale = fitRectToRect(App.Current.viewportSize(), rect);
        this.view.scale(scale);
    }

    isInvalidateRequired()
    {
        var artboard = this.children[0];
        if(!artboard){
            return false;
        }

        return this.invalidateRequired = (this._version !== artboard.version
        || this.scrollX() !== this._sX
        || this.scrollY() !== this._sY
        || this.scale() !== this._ss);
    }

    draw(){
        super.draw.apply(this, arguments);
        var artboard = this.children[0];
        if(artboard){
            this._version = artboard.version;
        }
        this._sX = this.scrollX();
        this._sY = this.scrollY();
        this._ss = this.scale();
    }

    dispose(){
        if(this._pageChnagedToken){
            this._pageChnagedToken.dispose();
            this._pageChnagedToken = null;
        }

        if(this._onArtboardChangedToken){
            this._onArtboardChangedToken.dispose();
            this._onArtboardChangedToken = null;
        }
    }
}

PropertyMetadata.registerForType(ArtboardProxyPage, {});

export default class MirroringView extends ViewBase{
    constructor(app){
        super(app);
        this._invalidateRequestedToken = Invalidate.requested.bind(this, this.invalidate);
        this._proxyPage = new ArtboardProxyPage(app, this);
    }

    setup(deps){
        super.setup(deps);
        this.setActivePage(this._proxyPage);
    }

    invalidate(){
        this.requestRedraw();
    }

    detach(){
        super.detach();
        this._page.dispose();

        if(this._invalidateRequestedToken) {
            this._invalidateRequestedToken.dispose();
            this._invalidateRequestedToken = null;
        }
    }
    //
    // draw() {
    //     this.animationController.update();
    //
    //     var artboard = this._artboard;
    //     if(artboard && this._version !== artboard.version){
    //
    //         var scale = 1;
    //         if(!this.forceNoScale) {
    //             var rect = artboard.getBoundaryRect();
    //             scale = fitRectToRect(this.viewportSize, rect);
    //             this.scale(scale);
    //         }
    //
    //
    //
    //         var context = this.context;
    //         var scale = this.scale();
    //
    //         context.clearRect(0,0, context.canvas.width, context.canvas.height);
    //         context.save();
    //         context.scale(this.contextScale * scale, this.contextScale * scale);
    //         context.translate(-artboard.x() + (this.viewportSize.width - artboard.width() * scale)/2 | 0, -artboard.y()+ (this.viewportSize.height - artboard.height()*scale)/2 |0);
    //         artboard.draw(context, this._envArray[0]);
    //         context.restore();
    //         this._version = artboard.version;
    //     }
  //  }
}