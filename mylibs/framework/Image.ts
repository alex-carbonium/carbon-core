import UIElement, { IUIElementRuntimeProps } from "./UIElement";
import Container from "./Container";
import ImageSourceHelper from "./ImageSourceHelper";
import PropertyMetadata from "./PropertyMetadata";
import Brush from "./Brush";
import { Overflow, Types } from "./Defs";
import Invalidate from "./Invalidate";
import ImageEditTool from "./ImageEditTool";
import EventHelper from "./EventHelper";
import RectMask from "./RectMask";
import { ContentSizing, ImageSource, ImageSourceType, IImage, IImageProps } from "carbon-model";
import { IRect, OriginType } from "carbon-geometry";
import { ChangeMode, IContext, RenderEnvironment } from "carbon-core";

const DefaultSizing = ContentSizing.fill;

interface IImageRuntimeProps extends IUIElementRuntimeProps {
    loaded: boolean;
    resizeOnLoad?: OriginType|null;
    sourceProps?: any;
    mask?: UIElement;
    origSource?: any;
    isTransformationClone?: boolean;
}

export default class Image extends Container<IImageProps> implements IImage {
    runtimeProps: IImageRuntimeProps;

    prepareProps(changes) {
        super.prepareProps.apply(this, arguments);
        var source = changes.source || this.source();
        if (ImageSourceHelper.isEditSupported(source)) {
            var brChanged = changes.hasOwnProperty("br");
            if (changes.hasOwnProperty("sizing") || brChanged) {
                var oldRect = this.boundaryRect();
                var newRect = changes.br || oldRect;
                var sourcePropsChanged = changes.hasOwnProperty("sourceProps");
                var sourceProps = sourcePropsChanged ? changes.sourceProps : this.props.sourceProps;
                var runtimeSourceProps = sourcePropsChanged ? changes.sourceProps : this.runtimeProps.sourceProps;
                ImageSourceHelper.prepareProps(source, changes.sizing || this.sizing(), oldRect, newRect,
                    sourceProps, runtimeSourceProps, changes, !this.runtimeProps.isTransformationClone);
            }
        }
    }

    propsUpdated(newProps) {
        super.propsUpdated.apply(this, arguments);
        if (newProps.source) {
            delete this.runtimeProps.loaded;
            delete this.runtimeProps.sourceProps;
        }
        if (newProps.sourceProps && this.runtimeProps.sourceProps) {
            if (newProps.sourceProps.sr) {
                this.runtimeProps.sourceProps.sr = newProps.sourceProps.sr;
            }
            if (newProps.sourceProps.dr) {
                this.runtimeProps.sourceProps.dr = newProps.sourceProps.dr;
            }
        }
        var source = this.source();
        if (ImageSourceHelper.isEditSupported(source)) {
            if (newProps.hasOwnProperty("sizing") || newProps.hasOwnProperty("br")) {
                ImageSourceHelper.resize(source, this.sizing(), this.boundaryRect(), this.runtimeProps.sourceProps);
            }
        }
        //this.createOrUpdateClippingMask(source, newProps);
    }

    saveOrResetLayoutProps(mode: ChangeMode) {
        if (!this.runtimeProps.origSource) {
            this.runtimeProps.origSource = this.selectProps(["sourceProps"]);
        }
        else {
            this.setProps(this.runtimeProps.origSource);
        }
        return super.saveOrResetLayoutProps(mode);
    }
    clearSavedLayoutProps() {
        super.clearSavedLayoutProps();
        delete this.runtimeProps.origSource;
    }

    clone() {
        var clone = super.clone();
        //to avoid loading when dragging
        clone.resetRuntimeProps();
        clone.runtimeProps.sourceProps = Object.assign({}, this.runtimeProps.sourceProps);
        clone.runtimeProps.loaded = this.runtimeProps.loaded;
        return clone;
    }

    source(value?: ImageSource): ImageSource {
        if (value !== undefined) {
            this.setProps({ source: value });
        }
        return this.props.source;
    }

    sizing(value?) {
        if (value !== undefined) {
            this.setProps({ sizing: value });
        }
        return this.props.sizing;
    }

    fillBackground() {
        if (!ImageSourceHelper.isFillSupported(this.source())) {
            super.fillBackground.apply(this, arguments);
        }
    }

    strokeBorder() {
        if (!ImageSourceHelper.isFillSupported(this.source())) {
            super.strokeBorder.apply(this, arguments);
        }
    }

    shouldApplyViewMatrix() {
        return true;
    }

    lockedGroup(): boolean{
        return true;
    }

    drawSelf(context, w, h, environment: RenderEnvironment) {
        var source = this.source();
        if (!source) {
            return;
        }

        context.save();

        if (!this.runtimeProps.loaded) {
            var promise = ImageSourceHelper.load(source, this.props.sourceProps);
            if (promise) {
                promise.then(data => {
                    if (this.isDisposed()) {
                        return;
                    }
                    if (data) {
                        this.runtimeProps.sourceProps = data;
                        if (this.props.sourceProps) {
                            if (this.props.sourceProps.sr) {
                                this.runtimeProps.sourceProps.sr = this.props.sourceProps.sr;
                            }
                            if (this.props.sourceProps.dr) {
                                this.runtimeProps.sourceProps.dr = this.props.sourceProps.dr;
                            }
                        }
                        //this.createOrUpdateClippingMask(source, this.props);
                    }

                    var resizeOrigin = this.resizeOnLoad();
                    if (resizeOrigin){
                        this.autoResize(source, resizeOrigin);
                    }

                    ImageSourceHelper.resize(source, this.sizing(), this.boundaryRect(), this.runtimeProps.sourceProps);
                    this.clearRenderingCache();
                    Invalidate.request();
                });
            }
            this.runtimeProps.loaded = true;
        }

        if (this.runtimeProps.mask) {
            this.drawWithMask(context, this.runtimeProps.mask, 0, environment);
        }
        else {
            ImageSourceHelper.draw(source, context, w, h, this, environment);
        }

        context.restore();
    }

    renderAfterMask(context, items, i, environment: RenderEnvironment) {
        ImageSourceHelper.draw(this.source(), context, this.width(), this.height(), this, environment);
    }

    autoResize(source: ImageSource, origin: OriginType){
        var realRect = ImageSourceHelper.boundaryRect(source, this.runtimeProps.sourceProps);
        if (realRect === null){
            return;
        }

        var bb = this.getBoundingBox();
        var bbNew = bb.scale({x: realRect.width/bb.width, y: realRect.height/bb.height}, bb.origin(origin));

        var parentBr = this.parent().boundaryRect();
        var scaledRect = bbNew.intersect(parentBr);
        var sx = scaledRect.width/bbNew.width;
        var sy = scaledRect.height/bbNew.height;
        if (sx !== 1 || sy !== 1){
            var scale = Math.min(sx, sy);
            scaledRect = bbNew.scale({x: scale, y: scale}, bbNew.origin(origin));
        }
        scaledRect.roundMutable();

        this.boundaryRect(scaledRect.withPosition(0, 0));
        if (scaledRect.x || scaledRect.y){
            this.applyTranslation(scaledRect.topLeft().subtract(bb.topLeft()));
        }
    }

    clip(context: IContext) {
        //TODO: add back if necessary
        //if (this.globalViewMatrix().isTranslatedOnly())
        context.beginPath();
        let br = this.boundaryRect();
        context.rect(br.x, br.y, br.width, br.height);
        context.clip();
    }

    //TODO: add back if necessary
    createOrUpdateClippingMask(source, newProps) {
        if (!source) {
            return;
        }
        if (newProps.hasOwnProperty("angle") || newProps.hasOwnProperty("sourceProps")) {
            var shouldClip = ImageSourceHelper.shouldClip(source, this.width(), this.height(), this.runtimeProps.sourceProps);
            if (this.angle() % 360 === 0 || !shouldClip) {
                delete this.runtimeProps.mask;
            }
            else if (!this.runtimeProps.mask) {
                this.runtimeProps.mask = new RectMask();
                this.runtimeProps.mask.setProps(this.selectLayoutProps(), ChangeMode.Self);
                //parent needed for finding global context, not adding to children
                this.runtimeProps.mask.parent(this);
            }
        }
        if (this.runtimeProps.mask && (newProps.hasOwnProperty("width") || newProps.hasOwnProperty("height"))) {
            this.runtimeProps.mask.setProps({ width: this.width(), height: this.height() }, ChangeMode.Self);
        }
    }

    dblclick() {
        var source = this.source();
        if (ImageSourceHelper.isEditSupported(source)) {
            ImageEditTool.attach(this, Image.EmptySource);
        }
        else if (!ImageSourceHelper.hasValue(source)) {
            var e = { done: null };
            Image.uploadRequested.raise(e);
            if (e.done) {
                e.done.then(urls => this.prepareAndSetProps({
                    sizing: DefaultSizing,
                    sourceProps: null,
                    source: Image.createUrlSource(urls[0])
                }));
            }
        }
    }

    clipDragClone() {
        return true;
    }

    canAccept(elements, autoInsert?, allowMoveInOut?) {
        if (elements.length !== 1) {
            return false;
        }
        return elements[0] instanceof Image && allowMoveInOut;
    }

    canConvertToPath() {
        return this.props.sourceProps && !!this.props.sourceProps.svg;
    }

    convertToPath() {
        return fetch(this.props.sourceProps.svg, { cors: true })
            .then(response => {
                if (!(response.status >= 200 && response.status < 300)) {
                    throw new Error("Could not download vector");
                }
                return response.text();
            })
            .then(svg => {
                return window['svgParser'].loadSVGFromString(svg).then((result) => {
                    result.setProps({ x: this.x(), y: this.y() });
                    result.runtimeProps.ctxl = this.runtimeProps.ctxl;
                    return result;
                });
            });
    }

    autoPositionChildren(): boolean{
        return true;
    }

    insert(image: Image, index, mode) {
        // Should always update the current element since it can be used in symbols
        this.setProps(image.selectProps(["source", "sourceProps"]));
        return this;
    }

    resizeOnLoad(value?: OriginType|null): OriginType|null{
        if (arguments.length){
            this.runtimeProps.resizeOnLoad = value;
        }
        return this.runtimeProps.resizeOnLoad
    }

    getNonRepeatableProps() {
        var base = super.getNonRepeatableProps();
        return base.concat(["source", "sourceProps"]);
    }

    static createUrlSource(url: string): ImageSource{
        return ImageSourceHelper.createUrlSource(url);
    }

    static createElementSource(pageId: string, artboardId:string, elementId:string): ImageSource{
        return ImageSourceHelper.createElementSource(pageId, artboardId, elementId);
    }

    static tryCreateFromUrl(string: string): Image | null{
        if (!string){
            return null;
        }
        if (/https?:.*(jpe?g|png)$/gi.test(string)){
            var image = new Image();
            image.size({width: Image.NewImageSize, height: Image.NewImageSize});
            image.source(Image.createUrlSource(string));
            return image;
        }
        return null;
    }

    static uploadRequested = EventHelper.createEvent();
    static EmptySource = Object.freeze<ImageSource>({type: ImageSourceType.None});
    static readonly NewImageSize = 100;
}
Image.prototype.t = Types.Image;

PropertyMetadata.registerForType(Image, {
    fill: {
        defaultValue: Brush.createFromColor("#333")
    },
    source: {
        defaultValue: Image.EmptySource
    },
    sizing: {
        displayName: "Sizing",
        type: "dropdown",
        options: {
            items: [
                { name: "Fill proportionally", value: ContentSizing.fill },
                { name: "Fit proportionally", value: ContentSizing.fit },
                { name: "Center", value: ContentSizing.center },
                { name: "Original", value: ContentSizing.original },
                { name: "Fit frame", value: ContentSizing.stretch },
                { name: "Fixed", value: ContentSizing.fixed }
            ]
        },
        defaultValue: DefaultSizing
    },
    overflow: {
        defaultValue: Overflow.Clip
    },
    prepareVisibility: function (element: Image) {
        var base = PropertyMetadata.findForType(Container);
        return Object.assign({}, base, {
            sizing: ImageSourceHelper.isEditSupported(element.props.source)
        });
    },
    groups: function () {
        var baseGroups = PropertyMetadata.findForType(Container).groups();
        baseGroups.splice(1, 0, {
            label: UIElement.displayType(Types.Image),
            properties: ["sizing"]
        });

        return baseGroups;
    }
});
