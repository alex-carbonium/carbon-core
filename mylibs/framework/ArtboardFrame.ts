import PropertyMetadata from "framework/PropertyMetadata";
import UIElement from "framework/UIElement";
import { Overflow, Types, ContentBehavior } from "./Defs";
import Selection from "framework/SelectionModel";
import DataNode from "framework/DataNode";
import { ElementState } from "carbon-core";

export default class ArtboardFrameControl extends UIElement {
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

    edit() {
        if (this.mode() !== ElementState.Edit) {
            this.mode(ElementState.Edit);
            this._internalChange = true;
            Selection.refreshSelection();
            this._internalChange = false;
            this.invalidate();
        }
    }

    cancel() {
        this.mode(ElementState.Resize);
        this._internalChange = true;
        Selection.refreshSelection();
        this._internalChange = false;
        this.invalidate();
    }

    mousedown(event) {
        if (this.mode() === ElementState.Edit) {
            this.captureMouse();
            this._mousePressed = true;
            event.handled = true;
            this._startData = { x: event.x, y: event.y, ox: this.props.offsetX, oy: this.props.offsetY };
        }
    }

    mouseup(event) {
        if (this._mousePressed) {
            this.releaseMouse();
            this._mousePressed = false;
            delete this._startData;
        }
    }

    mousemove(event) {
        if (this._mousePressed) {
            var dx = event.x - this._startData.x;
            var dy = event.y - this._startData.y;
            this.setProps({ offsetX: Math.round(this._startData.ox + dx), offsetY: Math.round(this._startData.oy + dy) });
        }
    }

    unselect() {
        if (!this._internalChange && this.mode() === ElementState.Edit) {
            this.mode(ElementState.Resize);
            this.invalidate();
        }
    }

    dblclick(event) {
        this.edit();
        event.handled = true;
    }

    selectFrameVisible() {
        return this.mode() !== ElementState.Edit;
    }

    _initFromArtboard() {
        var artboard = this._artboard;
        if (!artboard) {
            return;
        }

        this.runtimeProps.artboardVersion = artboard.runtimeProps.version;
    }

    resetGlobalViewCache() {
        super.resetGlobalViewCache();
        this._container && this._container.resetGlobalViewCache();
    }

    onArtboardChanged() {
        this._initFromArtboard();
    }

    propsUpdated(props, oldProps) {
        super.propsUpdated(props, oldProps);
        if (props.source !== undefined) {
            if (!this._artboard || (props.source.pageId !== oldProps.source.pageId || props.source.artboardId !== oldProps.source.artboardId)) {
                var page = DataNode.getImmediateChildById(App.Current, props.source.pageId);
                if (page) {
                    this._artboard = DataNode.getImmediateChildById(page, props.source.artboardId, true);
                }
                delete this.runtimeProps.artboardVersion;
            }

            this._initFromArtboard();
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

    drawSelf(context, w, h, environment) {
        if (this._drawing) {
            return;
        }

        if (!this._artboard) {
            super.drawSelf.apply(this, arguments);
            context.save();
            context.beginPath();
            context.rectPath(0, 0, w, h);
            context.lineWidth = 1 * environment.view.contextScale;
            context.setLineDash([4 * environment.view.contextScale, 2 * environment.view.contextScale]);
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
        }

        context.save();
        if (this.props.content === ContentBehavior.Scale) {
            var scaleX = this.width() / this._artboard.width();
            var scaleY = this.height() / this._artboard.height();
            context.scale(scaleX, scaleY);
        }
        this._artboard.globalViewMatrixInverted().applyToContext(context);
        context.translate(this.props.offsetX, this.props.offsetY);

        let originalCtxl = this._artboard.runtimeProps.ctxl;
        this._artboard.applyVisitor(e => e.runtimeProps.ctxl = null);
        this._artboard.runtimeProps.ctxl = this.runtimeProps.ctxl;
        try {
            this._drawing = true;
            this._artboard.drawSelf.call(this._artboard, context, this._artboard.width(), this._artboard.height(), environment);
        } finally {
            this._artboard.runtimeProps.ctxl = originalCtxl;
            this._drawing = false;
        }
        context.restore();

        if (this.mode() === ElementState.Edit) {
            context.save();
            context.beginPath();
            context.rectPath(0, 0, w, h);
            context.lineWidth = 4 * environment.view.contextScale;
            context.setLineDash([10 * environment.view.contextScale, 5 * environment.view.contextScale]);
            context.strokeStyle = "#000";
            context.stroke();
            context.restore();
        }
    }

    canAccept() {
        return false;
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
            return {
                items: page.getAllArtboards().map(artboard => {
                    return {
                        name: artboard.name(),
                        value: {
                            pageId: page.id(),
                            artboardId: artboard.id()
                        }
                    }
                })
            }
        }
    },
    overflow: {
        defaultValue: Overflow.Clip
    },

    content: {
        displayName: "@content",
        type: "dropdown",
        options: {
            size: 1,
            items: [
                { name: "@content_original", value: ContentBehavior.Original },
                // {name: "@content_stretch", value: ContentBehavior.Stretch},
                { name: "@content_scale", value: ContentBehavior.Scale }
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

    groups() {
        var baseGroups = PropertyMetadata.findForType(UIElement).groups();

        return [
            baseGroups.find(x => x.label === "Layout"),
            {
                label: "@settings",
                properties: ["source", "content", "offsetX", "offsetY", "overflow"]
            },
            {
                label: "Style",
                properties: ["opacity"]
            }
        ]
    }
})

