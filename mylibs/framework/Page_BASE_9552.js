import Layer from "./Layer";
import Matrix from "math/matrix";
import {ChangeMode} from "./Defs";
import ModelStateListener from "framework/sync/ModelStateListener";
import {areRectsIntersecting} from "math/math";
import Selection from "framework/SelectionModel";
import PropertyMetadata from "framework/PropertyMetadata";
import ContextPool from "framework/render/ContextPool";
import Environment from "environment";

var fwk = sketch.framework;

function getElementsInFrameHit(element, rect, scale) {
    if (!element.canSelect() || element.locked()) {
        return false;
    }

    var parent = element.parent();

    var boundingRect = element.getBoundaryRect();
    if (parent.canMultiselectChildren) {
        boundingRect = element.getBoundaryRectGlobal();
    }

    if (!element.hitVisible()) {
        return false;
    }

    return areRectsIntersecting(rect, boundingRect);
}

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

class Page extends Layer {

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

        this.onActivated = fwk.EventHelper.createEvent();
        this.onDeactivated = fwk.EventHelper.createEvent();

        this._initialized = false;
    }

    getElementsInRect(rect) {
        var selection = [];
        var scale = this.scale();
        this.getChildren().forEach(function (element) {
            if (element.multiselectTransparent === true) {
                element.applyVisitor(child => {
                    var found = false;
                    if (child.multiselectTransparent) {
                        child.getChildren && child.getChildren().forEach((e) => {
                            if (
                                !e.multiselectTransparent && getElementsInFrameHit(e, rect, scale)
                            ) {
                                selection.push(e);
                                found = true;
                            }
                        })
                        ;
                        return !found && child.multiselectTransparent === true;
                    }
                })
                ;
            }
            else if (getElementsInFrameHit(element, rect, scale)) {
                selection.push(element);
            }
        });

        return selection;
    }

    dropToPage(x, y, element) {
        var eventData = {
            handled: false,
            element: element,
            x: x,
            y: y
        };
        var data = this.findDropToPageData(x, y, element);

        element.position(data.position);
        data.target.add(element);
        element.dropOn(eventData);

        return data.target;
    }

    findDropToPageData(x, y, element) {
        var eventData = {
            handled: false,
            element: element,
            x: x,
            y: y
        };

        if (!element.isDropSupported()) {
            return null;
        }

        var el = this.hitElement(eventData, this.scale());


        while (!(el.canAccept(element) && element.canBeAccepted(el))) {
            el = el.parent();
        }

        var pos = el.global2local(eventData);

        return {target: el, position: pos};
    }


    iconType() {
        return 'page';
    }

    scrollX() {
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

    scrollY(value) {
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
        var viewMatrix = this.pageMatrix = new Matrix();
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

    scale(value) {
        if (value !== undefined) {
            this._scale = value;
            this.updatePageMatrix();
        }
        return this._scale;
    }

    initId() {
        this.id(this.app.nextPageId());
    }

    isAtomicInModel() {
        return false;
    }

    getChildren() {
        return this.children;
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

    autoInsert(/*UIElement*/element) {
        var container;
        var position = element.autoPosition();
        var elements = [];
        var contentContainer = this.getContentContainer();


        each(Selection.selectedElements(), function (el) {
            if (el.canAccept(element, true)) {
                container = el;
                return false;
            }
        });

        var selectedElement = Selection.selectedElement();
        if (!container && selectedElement && selectedElement.__type__ === element.__type__) {
            container = selectedElement.parent();
        }

        if (!container) {
            container = contentContainer;
        }
        if (!container.canAccept(element)) {
            container = this;
            position = "outside";
        }

        for (var i = 0; i < container.children.length; i++) {
            var el = container.children[i];
            if (el.autoPosition() == position) {
                elements.push(el);
            }
        }

        var pos = 0;
        if (position === 'top') {
            pos = sketch.util.max(elements, function (el) {
                    return el.y() + el.height();
                }) || 0;
            element.resize({
                x: 0,
                y: pos,
                width: container.width(),
                height: element.height()
            });
        }
        else if (position === 'bottom') {
            pos = sketch.util.min(elements, function (el) {
                    return el.y();
                }) || container.height();

            element.resize({
                x: 0,
                y: pos - element.height(),
                width: container.width(),
                height: element.height()
            });
        }
        else if (position === 'middle') {
            var top = element.y(~~((container.height() - element.height()) / 2));
            element.resize({
                x: 0,
                y: top,
                width: container.width(),
                height: element.height()
            });
        }
        else if (position === 'fill') {
            var topelements = [];
            for (var i = 0; i < container.children.length; i++) {
                var el = container.children[i];
                if (el.autoPosition() == 'top') {
                    topelements.push(el);
                }
            }
            var bottomelements = [];
            for (var i = 0; i < container.children.length; i++) {
                var el = container.children[i];
                if (el.autoPosition() == 'bottom') {
                    bottomelements.push(el);
                }
            }
            var bottom = sketch.util.min(bottomelements, function (el) {
                    return el.y();
                }) || container.height();

            var top = sketch.util.max(topelements, function (el) {
                    return el.y() + el.height();
                }) || 0;

            element.resize({
                x: 0,
                y: top,
                width: container.width(),
                height: bottom - top
            });
        }
        else if (position === 'center') {
            element.x(~~((container.width() - element.width()) / 2));
            element.y(~~((container.height() - element.height()) / 2));
        } else if (position === 'parent') {
            var parent;
            for (var i = 0; i < container.children.length; i++) {
                var el = container.children[i];
                if (el.canAccept(element, true)) {
                    parent = el;
                }
            }
            if (parent) {
                container = parent;
            }
        }
        else if (position === "outside") {
            element.x(contentContainer.right() + 5);
            element.y(contentContainer.y());
        }

        if (typeof container.setChildAutoPosition === 'function') {
            container.setChildAutoPosition(element);
        }

        return container;
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

    renderContentTile(context, x, y, zoom, contextScale) {
        var rect = this.getContentOuterSize();

        context.save();
        context.scale(contextScale, contextScale);
        var matrix = new Matrix();
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
                contextScale: contextScale
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

    name(value) {
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

    preview(value) {
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

    isPhoneVisible(visible) {
        return false;
    }

    activating() {
    }

    activated(previousPage) {
        this.onActivated.raise();

        //setTimeout(function(){
        //    var p1 = sketch.ui.common.Path.rectangle(50, 50, 300, 200);
        //    p1.borderBrush(fwk.Brush.createFromColor("blue"));
        //    this.add(p1);
        //
        //    var p2 = sketch.ui.common.Path.circleAtPoint({x:355, y:240}, 125);
        //    p2.borderBrush(fwk.Brush.createFromColor("red"));
        //    this.add(p2);
        //
        //
        //    var newPath = sketch.ui.common.Path.xor(p1, p2);
        //    newPath.backgroundBrush(fwk.Brush.createFromColor("green"));
        //    this.add(newPath);
        //}.bind(this), 500);
    }

    deactivating() {
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
        return this.getContentContainer();
    }

    getAllArtboards() {
        //TODO: add functionality
        return [this.getContentContainer()];
    }

    draw() {
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
        if (options.addGutters !== false) {
            if (!this.isPhoneVisible()) {
                //account for resizers + some gutter
                contentSize.width += 30;
                contentSize.height += 30;
            }
            else {
                //add some gutters so that image does not touch the borders
                contentSize.width += 10;
                contentSize.height += 10;
            }
        }

        var scale = size.width / contentSize.width;
        if (options.maxScale && scale > options.maxScale) {
            scale = options.maxScale;
        }
        if (options.widthOnly) {
            return scale;
        }
        var newHeight = contentSize.height * scale;
        if (newHeight <= size.height) {
            return scale;
        }

        scale = size.height / contentSize.height;
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

    relayout() {
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


}


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
        defaultValue: fwk.Brush.Empty,
        type: "fill"
    },
    isDeleted: {
        displayName: "Is Deleted",
        defaultValue: false,
        useInModel: true
    }
});


fwk.Page = Page;

export default fwk.Page;
