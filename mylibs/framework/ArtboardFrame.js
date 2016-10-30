import PropertyMetadata from "framework/PropertyMetadata";
import UIElement from "framework/UIElement";
import {Overflow, Types} from "./Defs";

export default class ArtboardFrameControl extends UIElement {
    constructor() {
        super();
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

    displayType(){
        if(this._artboard){
            return this._artboard.name() + ' {index}';
        }

        return "Frame {index}"
    }

    systemType() {
        return this._artboard != null ? 'user:' + this._artboard.name() : super.systemType();
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

    drawSelf() {
        if (this._artboard) {
            this._artboard.drawSelf.apply(this._artboard, arguments);
        } else {
            super.drawSelf.apply(this, arguments);
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

    groups(){
        return [{
            label: "",
            properties: ["source", "overflow"]
        }]
    }
})

