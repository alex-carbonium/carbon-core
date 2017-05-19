import Layer from "./Layer";
import Container from "./Container";
import Matrix from "math/matrix";
import {Types} from "./Defs";
import {areRectsIntersecting} from "math/math";
import Selection from "framework/SelectionModel";
import PropertyMetadata from "framework/PropertyMetadata";
import ContextPool from "framework/render/ContextPool";
import EventHelper from "./EventHelper";
import Brush from "./Brush";
import NameProvider from "ui/NameProvider";
import { IContainer, IRect, IPage, IArtboard, ChangeMode, IPrimitiveRoot } from "carbon-core";

function findNextPageName() {
    var maxId = 0;
    each(App.Current.pages, function (page) {
        var name = page.name();
        var match = /^Page (\d+)$/.exec(name);
        if (match) {
            var id = parseInt(match[1]);
            if (id > maxId) {
                maxId = id;
            }
        }
    });

    return "Page " + (maxId + 1);
}


var pageNameSlugRegex = /[^\wа-яА-Я]/g;

class Page extends Layer implements IPage, IPrimitiveRoot {
    [name: string]: any;

    constructor() {
        super();
        this.app = App.Current;
        this.initId();
        this.setProps({name: findNextPageName()}, ChangeMode.Self);
        this._scale = 1;

        this._scale = 1;
        this._scrollX = 0;
        this._scrollY = 0;
        this.updatePageMatrix();


        this.nativeElements = [];

        this.onActivated = EventHelper.createEvent();
        this.onDeactivated = EventHelper.createEvent();

        this._initialized = false;
    }

    get nameProvider(){
        if(!this._nameProvider){
            this._nameProvider = new NameProvider(this);
        }

        return this._nameProvider;
    }

    scrollX(value?:number) {
        if (arguments.length === 1) {
            this._scrollX = arguments[0];

            if (this._minScrollX != null && this._scrollX < this._minScrollX) {
                this._scrollX = this._minScrollX;
            }
            else if (this._maxScrollX != null && this._scrollX > this._maxScrollX) {
                this._scrollX = this._maxScrollX;
            }

            this.updatePageMatrix();
        }
        return this._scrollX;
    }

    scrollY(value?:number) {
        if (arguments.length === 1) {
            this._scrollY = arguments[0];

            if (this._minScrollY != null && this._scrollY < this._minScrollY) {
                this._scrollY = this._minScrollY;
            }
            else if (this._maxScrollY != null && this._scrollY > this._maxScrollY) {
                this._scrollY = this._maxScrollY;
            }

            this.updatePageMatrix();
        }
        return this._scrollY;
    }

    minScrollX(value) {
        if (arguments.length > 0) {
            this._minScrollX = value;
        }

        return this._minScrollX;
    }

    maxScrollX(value) {
        if (arguments.length > 0) {
            this._maxScrollX = value;
        }

        return this._maxScrollX;
    }

    maxScrollY(value) {
        if (arguments.length > 0) {
            this._maxScrollY = value;
        }

        return this._maxScrollY;
    }

    minScrollY(value) {
        if (arguments.length > 0) {
            this._minScrollY = value;
        }

        return this._minScrollY;
    }

    updatePageMatrix() {
        var viewMatrix = this.pageMatrix = Matrix.create();
        var scale = this.scale();
        viewMatrix.translate(-(0 | this.scrollX()), -(0 | this.scrollY()));
        viewMatrix.scale(scale, scale);
    }

    zoomToFit(size, options) {
        var scale = this.scaleToSize(size, options);
        this.scale(scale);
        return scale;
    }

    scrollTo(scrollPosition) {
        if (scrollPosition.scrollX !== undefined) {
            this.scrollX(scrollPosition.scrollX);
        }
        if (scrollPosition.scrollY !== undefined) {
            this.scrollY(scrollPosition.scrollY);
        }
    }

    scale(value?:any) {
        if (value !== undefined) {
            this._scale = value;
            this.updatePageMatrix();
        }
        return this._scale;
    }

    initId() {
        this.id(this.app.nextPageId());
    }

    status(value) {
        if (value !== undefined) {
            this.setProps({status: value});
        }
        return this.props.status;
    }

    background(value) {
        if (value !== undefined) {
            this.setProps({background: value});
        }
        return this.props.background;
    }

    groupId(value) {
        if (value !== undefined) {
            this.setProps({groupId: value});
        }
        return this.props.groupId;
    }

    version(value) {
        if (value !== undefined) {
            this.setProps({version: value});
        }
        return this.props.version;
    }

    incrementVersion() {
        this.runtimeProps.version = this.runtimeProps.version || 1;
        this.runtimeProps.version++;
    }

    initPage(view) {
        this._view = view;
        this._initialized = true;
    }

    isInitialized() {
        return this._initialized;
    }

    orientation(value) {
        if (value !== undefined) {
            this.setProps({orientation: value});
        }
        return this.props.orientation;
    }

    hitTest() {
        return true;
    }

    getAspectRation() {
        var container = this.getContentContainer();
        if (!container) {
            return 1;
        }
        return container.width() / container.height();
    }
    getArtboardAtPoint(point){
        return null;
    }

    insertArtboards(artboards){
    }

    autoInsert(/*UIElement*/element) {
    }

    renderTile(canvas, options) {
        var context = canvas.getContext('2d');
        var container = this.getContentContainer();
        if (!container) {
            context.fillStyle = 'white';
            context.fillRect(0, 0, canvas.width, canvas.height);
            return;
        }

        var dw = (options && options.dw) || 100,//TODO: move value somewhere to constants
            dh = (options && options.dh) || 100,
            sw = container.width(),
            sh = container.height();
        if (sw == 0 || sh == 0) {
            return;
        }
        var sr = sw / sh,
            h = dh,
            w = dh * sr;
        if (w > dw) {
            w = dw;
            h = dh / sr;
        }

        var scale = w / sw;
        canvas.width = w;
        canvas.height = h;
        context.fillStyle = 'white';
        context.fillRect(0, 0, w, h);
        return this.renderContentTile(context, 0, 0, scale);
    }

    renderExportPreview(options) {
        var rect = this.getContentOuterSize();

        var dw = (options && options.dw) || 100,//TODO: move value somewhere to constants
            dh = (options && options.dh) || 100,
            sw = rect.width,
            sh = rect.height;
        if (sw == 0 || sh == 0) {
            return;
        }
        var sr = sw / sh,
            h = dh,
            w = dh * sr;
        if (w > dw) {
            w = dw;
            h = dh / sr;
        }

        var scale = w / sw;
        var contextScale = 1;//options.contextScale || 1;
        var context = ContextPool.getContext(w, h, contextScale);
        context.fillStyle = '#b7babd';
        context.fillRect(0, 0, w * contextScale, h * contextScale);
        this.renderContentTile(context, 0, 0, scale, contextScale);

        var res = context.canvas.toDataURL("image/png");
        ContextPool.releaseContext(context);
        return res;
    }

    renderContentTile(context, x, y, zoom, contextScale?) {
        var rect = this.getContentOuterSize();

        context.save();
        context.scale(contextScale, contextScale);
        var matrix = Matrix.create();
        matrix.scale(zoom, zoom);
        matrix.translate(x - rect.x, y - rect.y);
        matrix.applyToContext(context)
        this.invalidate();
        this.draw(context, {
            finalRender: true, pageMatrix: matrix, setupContext: (context) => {
                context.scale(contextScale, contextScale);
                matrix.applyToContext(context);
            },
            view: {
                scale: () =>1,
                focused:()=>false,
                contextScale: contextScale,
                viewportRect: ()=>{
                    return {
                        x:-Number.MAX_VALUE/2,
                        y:-Number.MAX_VALUE/2,
                        width:Number.MAX_VALUE,
                        height:Number.MAX_VALUE
                    }
                }
            }
        });
        context.restore();
    }

    renderContentToDataURL() {
        var content = this.getContentContainer();
        var canvas = document.createElement("canvas");

        canvas.width = content.width();
        canvas.height = content.height();

        this.renderContentTile(canvas.getContext("2d"), 0, 0, 1);

        return canvas.toDataURL("image/png");
    }

    name(value?) {
        if (value !== undefined) {
            this.setProps({name: value});
        }
        return this.props.name;
    }

    encodedName() {
        var name = this.name();
        if (name) {
            name = name.replace(pageNameSlugRegex, '');
        }
        return name;
    }

    preview(value?) {
        return false;
    }

    previewOptions() {
        return null;
    }

    primitiveRoot() {
        return this;
    }

    primitivePath() {
        var path = this.runtimeProps.primitivePath;
        if (!path) {
            path = [this.id(), this.id()];
            this.runtimeProps.primitivePath = path;
        }
        return path;
    }

    primitiveRootKey() {
        return this.id();
    }

    isPhoneVisible(visible?) {
        return false;
    }

    activating() {
    }

    activated(previousPage?) {
        this.onActivated.raise();
    }

    deactivating() {
        return true;
    }

    deactivated() {
        Selection.unselectAll();
        this.onDeactivated.raise();
    }

    getContentContainer() {
        return this;
    }

    getContentOuterSize() {
        return this.getContentContainer().getBoundaryRect();
    }

    getActiveArtboard() {
        //TODO: add functionality
        return null;
    }

    getAllArtboards(): IArtboard[] {
        //TODO: add functionality
        return [];
    }

    draw(context, env) {
        return Layer.prototype.draw.apply(this, arguments);
    }

    scrollCenterPosition(viewportSize, scale) {
        var centerPoint = this.getPagePoint("center", "center");
        return this.pointToScroll(centerPoint, viewportSize, {scale: scale});
    }

    pointToScroll(point, viewportSize, options) {
        options = extend({anchorX: "center", anchorY: "center", gutterX: 0, gutterY: 0}, options);
        var scale = options.scale || this.scale();
        //var scroll = this.getMaxScroll(viewportSize, scale);

        var dx, dy;
        switch (options.anchorX) {
            case "center":
                dx = viewportSize.width / 2;
                break;
            case "left":
                dx = 0;
                break;
            case "right":
                dx = viewportSize.width;
                break;
        }
        switch (options.anchorY) {
            case "center":
                dy = viewportSize.height / 2;
                break;
            case "top":
                dy = 0;
                break;
            case "bottom":
                dy = viewportSize.height;
                break;
        }

        var scrollX = point.x * scale - dx - options.gutterX;
        var scrollY = point.y * scale - dy - options.gutterY;
        return {scrollX: scrollX, scrollY: scrollY};
    }

    getPagePoint(anchorX, anchorY) {
        return {x: 0, y: 0};
    }

    scaleToSize(size, options) {
        options = options || {};
        var contentSize = this.getContentOuterSize();
        var contentWidth = contentSize.width;
        var contentHeight = contentSize.height;
        if (options.addGutters !== false) {
            if (!this.isPhoneVisible()) {
                //account for resizers + some gutter
                contentWidth+= 30;
                contentHeight += 30;
            }
            else {
                //add some gutters so that image does not touch the borders
                contentWidth += 10;
                contentHeight += 10;
            }
        }

        var scale = size.width / contentWidth;
        if (options.maxScale && scale > options.maxScale) {
            scale = options.maxScale;
        }
        if (options.widthOnly) {
            return scale;
        }
        var newHeight = contentHeight * scale;
        if (newHeight <= size.height) {
            return scale;
        }

        scale = size.height / contentHeight;
        if (options.maxScale && scale > options.maxScale) {
            scale = options.maxScale;
        }
        return scale;
    }

    displaySize() {
        return {width: 0, height: 0};
    }

    viewportRect() {
        return {x: 0, y: 0, width: 0, height: 0};
    }

    isDeleted(value) {
        if (value !== undefined) {
            this.setProps({isDeleted: value});
        }
        return this.props.isDeleted;
    }

    isDesignerPage() {
        return !this.isTemporary() && !this.preview();
    }

    //
    // mapBosonToElement (elementId, bosons) {
    //     this._relayoutObject.mapBosonToElement(elementId, bosons);
    // },
    //
    // mapElementToParent (elementId, parentId) {
    //     this._relayoutObject.mapElementToParent(elementId, parentId);
    // },
    //
    // afterNextRelayout (callback) {
    //     this._relayoutObject.afterNextRelayout(callback);
    // },
    //
    // relayout () {
    //     this._relayoutObject.relayout();
    // },
    //
    relayoutCompleted() {

    }

    relayout(oldPropsMap) {
        // TODO: implement, return primitives or null
    }

    /*raiseTrackSetProps (element, props, oldProps) {
     ModelStateListener.trackSetProps(this, element, props, oldProps);
     },

     raiseTrackDelete (parent, element) {
     ModelStateListener.trackDelete(this, parent, element);
     },

     raiseTrackInsert (parent, element, index) {
     ModelStateListener.trackInsert(this, parent, element, index);
     },

     raiseTrackChangePosition (parent, element, index, oldIndex, oldParent) {
     ModelStateListener.trackChangePosition(this, parent, element, index, oldIndex, oldParent);
     }*/

     saveWorkspaceState(){
        return null;
     }
     restoreWorkspaceState(data){
     }

     isEditable(){
         return true;
     }
}
Page.prototype.t = Types.Page;

PropertyMetadata.registerForType(Page, {
    width: {
        useInModel: true,
        editable: false
    },
    height: {
        useInModel: true,
        editable: false
    },
    name: {
        displayName: "Page name",
        useInModel: true,
        type: "text"
    },

    orientation: {
        displayName: "Screen orientation",
        defaultValue: "portrait",
        type: "choice",
        useInModel: true,
        possibleValues: {portrait: "Portrait", landscape: "Landscape"}
    },
    groupId: {
        displayName: "Group",
        defaultValue: 0,
        useInModel: true
    },
    version: {
        displayName: "Version",
        defaultValue: 0
    },
    // status: {
    //     displayName: "Page Status",
    //     defaultValue: "inProgress",
    //     type: "choice",
    //     useInModel: false,
    //     editable:false
    // },
    background: {
        displayName: "Background",
        defaultValue: Brush.Empty,
        type: "fill"
    },
    isDeleted: {
        displayName: "Is Deleted",
        defaultValue: false,
        useInModel: true
    }
});

export default Page;
