import UIElement from "./UIElement";
import FrameSource from "./FrameSource";
import PropertyMetadata from "./PropertyMetadata";
import Brush from "./Brush";
import {ContentSizing, Overflow, Types} from "./Defs";
import Invalidate from "./Invalidate";

// function onLoaded(source){
//     var doResize = this.autoSize()
//         || (this.autoSizeOnFirstLoad() && this._firstLoad);
//
//     this._firstLoad = false;
//
//     if (doResize){
//         var w = 0, h = 0;
//
//         if (source){
//             w = source.width;
//             h = source.height;
//         }
//
//         var oldBoundary = this.getBoundaryRect();
//         var somethingChanged = w !== this.width() || h !== this.height();
//         if (w !== this.width()){
//             this.width(w);
//         }
//         if (h !== this.height()){
//             this.height(h);
//         }
//         if (somethingChanged){
//             //this.onresize.raise({oldValue: oldBoundary, newValue: this.getBoundaryRect()});
//         }
//         Invalidate.request();
//     }
// }

function sourceChanged(source){

    if (source){
        var that = this;
        FrameSource.init(source).then(function(source){
            that.props.source = source;
            if (source && source.type === fwk.FrameSource.types.font){
                if (that.fill()){
                    //this.properties.fill.show();
                    //this.properties.stroke.show();
                    fillStrokeChanged.call(that);
                }
            } else{
                //if (this.properties.fill){
                //    this.properties.fill.hide();
                //    this.properties.stroke.hide();
                //}
            }
            onLoaded.call(that, source);
        });

    }
}

export default class Frame extends UIElement {
    iconType(){
        return 'icon';
    }

    propsUpdated(newProps){
        super.propsUpdated.apply(this, arguments);
        if (newProps.source){
            delete this.runtimeProps.loaded;
            delete this.runtimeProps.sourceProps;
        }
        var source = this.source();
        if (FrameSource.isSizingSupported(source)){
            if (newProps.hasOwnProperty("sizing") || newProps.hasOwnProperty("width") || newProps.hasOwnProperty("height")){
                FrameSource.resize(source, this.sizing(), this.getContentRect(), this.runtimeProps.sourceProps);
            }
        }
    }

    clone(){
        var clone = super.clone();
        //to avoid loading when dragging
        clone.resetRuntimeProps();
        clone.updateViewMatrix();
        clone.runtimeProps.sourceProps = Object.assign({}, this.runtimeProps.sourceProps);
        clone.runtimeProps.loaded = this.runtimeProps.loaded;
        return clone;
    }

    getContentRect(){
        return {x: 0, y: 0, width: this.width(), height: this.height()};
    }

    source(value){
        if (value !== undefined){
            this.setProps({source: value});
        }
        return this.props.source;
    }

    sizing(value){
        if (value !== undefined){
            this.setProps({sizing: value});
        }
        return this.props.sizing;
    }

    drawSelf(context, w, h, environment){
        var source = this.source();
        if (!this.runtimeProps.loaded){
            var promise = FrameSource.load(source);
            if (promise){
                promise.then(data => {
                    if (data){
                        this.runtimeProps.sourceProps = data;
                    }
                    FrameSource.resize(source, sizing, this.getContentRect(), this.runtimeProps.sourceProps);
                    Invalidate.request();
                });
            }
            this.runtimeProps.loaded = true;
        }
        var sizing = this.sizing();
        FrameSource.draw(source, context, w, h, sizing, this.runtimeProps.sourceProps);
    }
    clipDragClone(){
        return true;
    }

    displayType(){
        return "Image";
    }
}
Frame.prototype.t = Types.Frame;

PropertyMetadata.registerForType(Frame, {
    fill: {
        defaultValue: Brush.createFromResource("default.text")
    },
    source: {
        defaultValue: FrameSource.Empty
    },
    sizing: {
        displayName: "Sizing",
        type: "dropdown",
        options: {
            items: [
                {name: "Fill proportionally", value: ContentSizing.fill},
                {name: "Fit proportionally", value: ContentSizing.fit},
                {name: "Center", value: ContentSizing.center},
                {name: "Original", value: ContentSizing.original},
                {name: "Fit frame", value: ContentSizing.stretch}
            ]
        },
        defaultValue: ContentSizing.original
    },
    overflow: {
        defaultValue: Overflow.Clip
    },
    visibleWhenDrag: {
        defaultValue: false
    },
    groups: function(element){
        var ownGroups = [
            {
                label: element ? element.displayType() : '',
                properties: ["sizing"]
            }
        ];

        var baseGroups = PropertyMetadata.findForType(UIElement).groups();
        return ownGroups.concat(baseGroups);
    },
    getNonRepeatableProps: function(element){
        var base = PropertyMetadata.findForType(UIElement).getNonRepeatableProps(element);
        return base.concat(["source"]);
    }
});
