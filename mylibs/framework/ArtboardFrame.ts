import PropertyMetadata from "framework/PropertyMetadata";
import { Overflow, Types, ContentBehavior } from "./Defs";
import Selection from "framework/SelectionModel";
import DataNode from "framework/DataNode";
import { ElementState, RenderEnvironment, IMouseEventData } from "carbon-core";
import RenderPipeline from "./render/RenderPipeline";
import ContextPool from "./render/ContextPool";
import { renderer } from "./render/Renderer";
import Container from "./Container";
import Symbol from "framework/Symbol";
import Matrix from "math/matrix";
import { ChangeMode } from "carbon-basics";
import UIElement from "./UIElement";
import NullContainer from "framework/NullContainer";
import Rect from "../math/rect";

export default class ArtboardFrameControl extends Container {
    constructor() {
        super();
        this._mode = ElementState.Resize;
    }

    mode(value?) {
        if (arguments.length > 0) {
            this._mode = value;
        }

        return this._mode;
    }

    get artboard() {
        return this._artboard;
    }

    private edit(view, controller) {
        if (this.mode() !== ElementState.Edit) {
            this.mode(ElementState.Edit);
            this._internalChange = true;
            Selection.makeSelection([]);
            Selection.makeSelection([this]);

            this._internalChange = false;
            this._cancelBinding = controller.actionManager.subscribe('cancel', this.cancel.bind(this));
            this.invalidate();
        }
    }

    mirrorClone() {
        if (this._cloning) {
            throw new Error("Can't clone, chain contains recursive references");
        }
        this._cloning = true;
        var clone = UIElement.prototype.mirrorClone.apply(this, arguments);

        delete this._cloning;
        return clone;
    }

    clone() {
        if (this._cloning) {
            throw new Error("Can't clone, chain contains recursive references");
        }
        this._cloning = true;
        var clone = UIElement.prototype.clone.apply(this, arguments);

        delete this._cloning;
        return clone;
    }

    cancel() {
        this.mode(ElementState.Resize);
        this._internalChange = true;
        Selection.reselect();

        this._internalChange = false;
        if (this._cancelBinding) {
            this._cancelBinding.dispose();
            this._cancelBinding = null;
        }
        this.invalidate();
    }

    mousedown(event:IMouseEventData) {
        if (this.mode() === ElementState.Edit) {
            event.controller.captureMouse(this);
            this._mousePressed = true;
            event.handled = true;
            this._startData = { x: event.x, y: event.y, ox: this.props.offsetX, oy: this.props.offsetY };
        }
    }

    mouseup(event:IMouseEventData) {
        if (this._mousePressed) {
            event.controller.releaseMouse(this);
            this._mousePressed = false;
            let ox = this.props.offsetX,
                oy = this.props.offsetY;
            this.setProps({ offsetX: this._startData.ox, offsetY: this._startData.oy }, ChangeMode.Self);
            this.setProps({ offsetX: ox, offsetY: oy });
            delete this._startData;
        }
    }

    mousemove(event) {
        if (this._mousePressed) {
            var dx = event.x - this._startData.x;
            var dy = event.y - this._startData.y;
            let ox = Math.round(this._startData.ox + dx);
            let oy = Math.round(this._startData.oy + dy);

            this.prepareAndSetProps({ offsetX: ox, offsetY: oy }, ChangeMode.Self);
        }
    }

    unselect() {
        if (!this._internalChange && this.mode() === ElementState.Edit) {
            this.cancel();
        }
    }

    dblclick(event) {
        this.edit(event.view, event.controller);
        event.handled = true;
    }

    selectFrameVisible() {
        return this.mode() !== ElementState.Edit;
    }

    lockedGroup() {
        return true;
    }

    canAccept() {
        return false;
    }

    _initFromArtboard() {
        var artboard = this._artboard;
        if (!artboard) {
            return;
        }
        this.children.forEach(c => { this.remove(c); c.dispose() });
        this.children.length = 0;
        let symbol = new Symbol();
        symbol.canSelect(false);
        symbol.setProps({
            source: {
                pageId: artboard.parent.id,
                artboardId: artboard.id
            }
        })

        this.add(symbol, ChangeMode.Self);

        if (this.props.contentBehavior === ContentBehavior.Original) {
            let size = this.getContentSize();
            this.setProps({
                maxScrollX: Math.max(0, size.width - this.width),
                maxScrollY: Math.max(0, size.height - this.height)
            });
        } else if (this.props.contentBehavior === ContentBehavior.Original) {
            let rect = symbol.boundaryRect();
            let newRect = this.boundaryRect();

            symbol.setProps({
                br: newRect,
                maxScrollX: 0,
                maxScrollY: 0
            }, ChangeMode.Self);
        }

        this.runtimeProps.artboardVersion = artboard.runtimeProps.version;

        this.invalidate(this.runtimeProps.ctxl);
    }

    get scrollHorizontal(): boolean {
        return this.props.scrollHorizontal;
    }

    set scrollHorizontal(value: boolean) {
        this.prepareAndSetProps({ scrollHorizontal: value });
    }

    get scrollVertical(): boolean {
        return this.props.scrollVertical;
    }

    set scrollVertical(value: boolean) {
        this.prepareAndSetProps({ scrollVertical: value });
    }

    get scrollX(): number {
        return -this.props.offsetX;
    }

    set scrollX(value: number) {
        this.prepareAndSetProps({ offsetX: -value });
    }

    get scrollY(): number {
        return -this.props.offsetY;
    }

    set scrollY(value: number) {
        this.prepareAndSetProps({ offsetY: -value });
    }

    get innerElement() {
        if (!this.children.length) {
            return null;
        }

        return this.children[0];
    }

    set artboardName(value) {
        let page = App.Current.activePage;
        if (page) {
            let artboard = page.children.find(a => a.name === value);
            if (artboard) {
                this.prepareAndSetProps({
                    source: {
                        pageId: page.id,
                        artboardId: artboard.id
                    }
                });
            }
        }
    }

    getContentSize() {
        let source = this._artboard;
        if (!source || this.props.contentBehavior === ContentBehavior.Scale) {
            return { width: this.width, height: this.height }
        }
        else {
            return { width: source.width, height: source.height };
        }
    }

    get minScrollY() {
        return this.props.minScrollY;
    }

    get maxScrollY() {
        return this.props.maxScrollY;
    }

    get minScrollX() {
        return this.props.minScrollX;
    }

    get maxScrollX() {
        return this.props.maxScrollX;
    }

    resetGlobalViewCache() {
        super.resetGlobalViewCache();
        this._container && this._container.resetGlobalViewCache();
    }

    onArtboardChanged() {
        this._initFromArtboard();
    }

    prepareProps(props) {
        let scrollHorizontal = props.scrollHorizontal === undefined ? this.props.scrollHorizontal : props.scrollHorizontal;
        let scrollVertical = props.scrollVertical === undefined ? this.props.scrollVertical : props.scrollVertical;
        if (props.offsetX !== undefined) {
            if (scrollHorizontal) {
                if (props.offsetX > -this.minScrollX) {
                    props.offsetX = -this.minScrollX;
                } else if (props.offsetX < -this.maxScrollX) {
                    props.offsetX = -this.maxScrollX;
                }
            } else {
                props.offsetX = 0;
            }
        }

        if (props.offsetY !== undefined) {
            if (scrollVertical) {
                if (props.offsetY > -this.minScrollY) {
                    props.offsetY = -this.minScrollY;
                } else if (props.offsetY < -this.maxScrollY) {
                    props.offsetY = -this.maxScrollY;
                }
            } else {
                props.offsetY = 0;
            }
        }

        let contentBehavior = props.contentBehavior || this.props.contentBehavior;

        if (props.scrollHorizontal === false || contentBehavior !== ContentBehavior.Original ) {
            props.offsetX = 0;
        }

        if (props.scrollVertical === false || contentBehavior !== ContentBehavior.Original ) {
            props.offsetY = 0;
        }
    }

    propsUpdated(props, oldProps, mode) {
        super.propsUpdated(props, oldProps, mode);
        if (props.source !== undefined) {
            if (!this._artboard || (props.source.pageId !== oldProps.source.pageId || props.source.artboardId !== oldProps.source.artboardId)) {
                var page = DataNode.getImmediateChildById(App.Current, props.source.pageId);
                if (page) {
                    this._artboard = DataNode.getImmediateChildById(page, props.source.artboardId, true);
                }
                delete this.runtimeProps.artboardVersion;
            }

            this._initFromArtboard();
            let size = this.getContentSize();
            this.setProps({
                offsetX: 0,
                offsetY: 0,
                maxScrollX: Math.max(0, size.width - this.width),
                maxScrollY: Math.max(0, size.height - this.height)
            });
        }

        if (props.contentBehavior !== undefined || props.br !== undefined || props.m !== undefined) {
            let size = this.getContentSize();
            this.setProps({
                maxScrollX: Math.max(0, size.width - this.width),
                maxScrollY: Math.max(0, size.height - this.height)
            }, mode);

            let contentBehavior = props.contentBehavior || this.props.contentBehavior;
            if (this.children.length) {
                let child = this.children[0];
                let newRect;
                let newProps;
                if (contentBehavior === ContentBehavior.Original) {
                    newRect = Rect.fromSize(child.artboard.width, child.artboard.height);
                } else {
                    newRect = Rect.fromSize(this.width, this.height);
                }
                let oldRect = child.boundaryRect();
                child.setProps({ br: newRect }, ChangeMode.Self);
                child.performArrange({ oldRect: oldRect, newRect: newRect }, ChangeMode.Self);
            }
        }

        if ((props.hasOwnProperty('offsetX') || props.hasOwnProperty('offsetY')) && this.children.length) {
            this.children[0].setProps({ m: Matrix.createTranslationMatrix(this.props.offsetX, this.props.offsetY) }, ChangeMode.Self);
        }

        if (props.scrollX !== undefined || props.scrollY !== undefined) {
            this.raiseEvent("scroll", {
                scrollX: this.scrollX,
                scrollY: this.scrollY,
                target: this.runtimeProxy()//RuntimeProxy.wrap(this)
            })
        }
    }

    source(value) {
        if (arguments.length > 0) {
            this.setProps({ source: value });
        }

        return this.props.source;
    }

    draw() {
        if (this._artboard && this.runtimeProps.artboardVersion !== this._artboard.runtimeProps.version) {
            this._initFromArtboard();
        }
        super.draw.apply(this, arguments);
    }

    innerChildren() {
        if (this._artboard) {
            return [this._artboard];
        }

        return null;
    }

    fillBackground() {

    }

    strokeBorder() {

    }

    fitSizeToContent() {
        let source = this._artboard;
        if(source) {
            this.setProps({br:Rect.fromSize(source.width, source.height)}, ChangeMode.Self);
        }
    }

    drawSelf(context, w, h, environment: RenderEnvironment) {
        if (this._drawing) {
            return;
        }
        let source = this._artboard;
        if (!source) {
            context.save();
            this.globalViewMatrix().applyToContext(context);
            context.beginPath();
            context.rectPath(0, 0, w, h);
            context.lineWidth = 1 * environment.contextScale;
            context.setLineDash([4 * environment.contextScale, 2 * environment.contextScale]);
            context.strokeStyle = "#000";
            context.stroke();

            let text = "empty";
            let fontSize = Math.min(h - 8, 24);
            context.font = fontSize + "px Arial";

            let width = context.measureText(text).width + .5 | 0;
            if (width > w) {
                fontSize *= (w - 8) / width;
                if (fontSize > 4) {
                    context.font = (fontSize | 0) + "px Arial";
                    width = context.measureText(text).width + .5 | 0;
                }
            }

            if (fontSize > 4) {
                context.fillStyle = 'black';
                context.textBaseline = "middle";
                context.fillText(text, w / 2 - width / 2 + .5 | 0, h / 2 + .5 | 0);
            }

            context.restore();
            return;
        } else {
            super.drawSelf(context, w, h, environment);
        }

        if (this.mode() === ElementState.Edit) {
            context.save();
            this.globalViewMatrix().applyToContext(context);
            context.beginPath();
            context.rectPath(0, 0, w, h);
            context.lineWidth = 4 * environment.contextScale;
            context.setLineDash([10 * environment.contextScale, 5 * environment.contextScale]);
            context.strokeStyle = "#000";
            context.stroke();
            context.restore();
        }
    }
}

ArtboardFrameControl.prototype.t = Types.ArtboardFrame;


PropertyMetadata.registerForType(ArtboardFrameControl, {
    source: {
        displayName: "Artboard",
        type: "dropdown",
        defaultValue: { artboardId: null, pageId: null },
        getOptions: function (element) {
            let page = App.Current.activePage;
            let parentIds = {};
            element.each(e => {
                let parent = e.parent;
                while (parent && parent !== NullContainer) {
                    parentIds[parent.id] = true;
                    parent = parent.parent;
                }
            });

            return {
                items: page.getAllArtboards().filter(a => !parentIds[a.id]).map(artboard => {
                    return {
                        name: artboard.name,
                        value: {
                            pageId: page.id,
                            artboardId: artboard.id
                        }
                    }
                })
            }
        }
    },
    overflow: {
        defaultValue: Overflow.Clip
    },

    contentBehavior: {
        displayName: "@contentBehavior",
        type: "dropdown",
        options: {
            size: 1,
            items: [
                { name: "@content_original", value: ContentBehavior.Original },
                { name: "@content_stretch", value: ContentBehavior.Stretch },
                //{ name: "@content_scale", value: ContentBehavior.Scale }
            ]
        },
        defaultValue: ContentBehavior.Original
    },

    offsetX: {
        displayName: "@offsetX",
        defaultValue: 0,
        type: "numeric"
    },
    offsetY: {
        displayName: "@offsetY",
        defaultValue: 0,
        type: "numeric"
    },

    minScrollX: {
        defaultValue: 0
    },
    minScrollY: {
        defaultValue: 0
    },
    maxScrollX: {
        defaultValue: 0
    },
    maxScrollY: {
        defaultValue: 0
    },
    scrollVertical: {
        defaultValue: true
    },
    scrollHorizontal: {
        defaultValue: true
    },

    groups() {
        var baseGroups = PropertyMetadata.findForType(Container).groups();

        return [
            baseGroups.find(x => x.id === "layout"),
            {
                label: "@settings",
                properties: ["source", "contentBehavior", "offsetX", "offsetY", "overflow"]
            },
            {
                label: "Style",
                properties: ["opacity"]
            }
        ]
    },
    proxyDefinition: function () {
        let baseDefinition = PropertyMetadata.findForType(UIElement).proxyDefinition();
        return {
            rprops: [].concat(baseDefinition.rprops), // readonly props
            props: [
                "artboardName",
                "scrollX",
                "scrollY",
                "scrollHorizontal",
                "scrollHorizontal",
                "verticalSnapPoints",
                "horizontalSnapPoints",
            ].concat(baseDefinition.props),
            methods: ["fitSizeToContent"].concat(baseDefinition.methods),
            mixins: [].concat(baseDefinition.mixins)
        }
    }
})

