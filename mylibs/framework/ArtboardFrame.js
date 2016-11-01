import PropertyMetadata from "framework/PropertyMetadata";
import UIElement from "framework/UIElement";
import {Overflow, Types, ElementState, ContentBehavior} from "./Defs";
import Selection from "framework/SelectionModel";

export default class ArtboardFrameControl extends UIElement {
    constructor() {
        super();
        this._mode = ElementState.Resize;
    }

    mode(value) {
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
            this._startData = {x: event.x, y: event.y, ox: this.props.offsetX, oy: this.props.offsetY};
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
            this.setProps({offsetX: Math.round(this._startData.ox + dx), offsetY: Math.round(this._startData.oy + dy)});
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

    updateViewMatrix() {
        super.updateViewMatrix();
        this._container && this._container.updateViewMatrix();
    }

    onArtboardChanged() {
        this._initFromArtboard();
    }

    propsUpdated(props, oldProps) {
        super.propsUpdated(props, oldProps);
        if (props.source !== undefined) {
            if (props.source.pageId !== oldProps.source.pageId && props.source.artboardId !== oldProps.source.artboardId) {
                var page = App.Current.getPageById(props.source.pageId);
                if (page) {
                    this._artboard = page.getArtboardById(props.source.artboardId);
                }
                delete this.runtimeProps.artboardVersion;
            }

            this._initFromArtboard();
        }
    }

    source(value) {
        if (arguments.length > 0) {
            this.setProps({source: value});
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
        if (!this._artboard) {
            super.drawSelf.apply(this, arguments);

            return;
        }

        context.save();
        if (this.props.content === ContentBehavior.Scale) {
            var scaleX = this.width() / this._artboard.width();
            var scaleY = this.height() / this._artboard.height();
            context.scale(scaleX, scaleY);
        }
        context.translate(this.props.offsetX, this.props.offsetY);
        this._artboard.drawSelf.call(this._artboard, context, this._artboard.width(), this._artboard.height(), environment);
        context.restore();

        if (this.mode() === ElementState.Edit) {
            context.save();
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

    static t = Types.ArtboardViewer;
}
ArtboardFrameControl.prototype.t = Types.ArtboardFrame;


PropertyMetadata.registerForType(ArtboardFrameControl, {
    source: {
        displayName: "Artboard",
        type: "artboard",
        defaultValue: {artboardId: null, pageId: null}
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
                {name: "@content_original", value: ContentBehavior.Original},
                // {name: "@content_stretch", value: ContentBehavior.Stretch},
                {name: "@content_scale", value: ContentBehavior.Scale}
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

    groups(){
        return [
            {
                label: "@settings",
                properties: ["source", "content", "offsetX", "offsetY", "overflow"]
            },
            {
                label: "Style",
                properties: ["opacity"]
            },
            {
                label: "Appearance",
                properties: ["visible"]
            },
            {
                label: "Layout",
                properties: ["width", "height", "x", "y", "anchor", "angle", "dockStyle", "horizontalAlignment", "verticalAlignment"]
            }]
    }
})

