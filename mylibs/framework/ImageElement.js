import Invalidate from "framework/Invalidate";
import {ChangeMode} from "./Defs";

define(["framework/UIElement", "framework/QuadAndLock", "framework/ImageSource"], function (UIElement, QuadAndLock, ImageSource) {
    var fwk = sketch.framework;

    function onLoaded(source){
        var doResize = this.autoSize()
            || (this.autoSizeOnFirstLoad() && this._firstLoad);

        this._firstLoad = false;

        if (doResize){
            var w = 0, h = 0;

            if (source){
                w = source.width;
                h = source.height;
            }

            var oldBoundary = this.getBoundaryRect();
            var somethingChanged = w !== this.width() || h !== this.height();
            if (w !== this.width()){
                this.width(w);
            }
            if (h !== this.height()){
                this.height(h);
            }
            if (somethingChanged){
                //this.onresize.raise({oldValue: oldBoundary, newValue: this.getBoundaryRect()});
            }
            Invalidate.request();
        }
    }

    function sourceChanged (source) {

        if (source) {
            var that = this;
            ImageSource.init(source).then(function(source){
                that.props.source = source;
                if(source  && source.type === fwk.ImageSource.types.font){
                    if (that.backgroundBrush()){
                        //this.properties.backgroundBrush.show();
                        //this.properties.borderBrush.show();
                        fillStrokeChanged.call(that);
                    }
                } else {
                    //if (this.properties.backgroundBrush){
                    //    this.properties.backgroundBrush.hide();
                    //    this.properties.borderBrush.hide();
                    //}
                }
                onLoaded.call(that, source);
            });

        }
    }

    function fillStrokeChanged(){
        var source = this.source();
        if(source  && source.type === fwk.ImageSource.types.font){
            source.fillBrush = this.backgroundBrush();
            source.strokeBrush = this.borderBrush();
        }
    }

    klass2('sketch.framework.ImageElement', UIElement, {
        __version__: 6,
        _constructor:function () {
            this._firstLoad = true;
            this._image = null;

            //this.properties.metadataType("sketch.framework.ImageElement");
            //this.properties.createProperty("source", fwk.ImageSource.None());
            //this.properties.createProperty("cornerRadius", fwk.QuadAndLock.Default);

            //this.properties.createProperty("displayMode", "stretch");

            if (this.backgroundBrush()){
                //this.properties.backgroundBrush.hide()
                //    //.setDefaultValue(fwk.Brush.createFromResource("default.text"))
                //    .value(fwk.Brush.createFromResource("default.text"));
                //this.properties.borderBrush.hide();
                //this.properties.borderWidth.hide();
                this.setProps({backgroundBrush:fwk.Brush.createFromResource("default.text")}, ChangeMode.Root);
            }

            this.quickEditProperty("source");
        },

        iconType:function(){
            return 'icon';
        },

        setProps:function(props) {
            UIElement.prototype.setProps.apply(this, arguments);
            if(props.source) {
                sourceChanged.call(this, props.source);
            }

            if(props.backgroundBrush || props.borderBrush) {
                fillStrokeChanged.call(this);
            }
        },
        source: function(value){
            if(value !== undefined){
                this.setProps({source:value});
            }
            return this.props.source;
        },
        displayMode:function (value) {
            if(value !== undefined){
                this.setProps({displayMode:value});
            }
            return this.props.displayMode;
        },
        autoSize:function (value) {
            return this.field("_autoSize", value, false);
        },
        autoSizeOnFirstLoad: function(value){
            return this.field("_autoSizeOnFirstLoad", value, false);
        },
        cornerRadius:function (value) {
            if(value !== undefined){
                this.setProps({cornerRadius:value});
            }
            return this.props.cornerRadius;
        },
        drawSelf:function (context, w, h, environment) {
            var cornerRadius = this.cornerRadius();
            if (QuadAndLock.hasAnyValue(cornerRadius)){
                //TODO: Refactor this part
                fwk.CrazyScope.push(false);
                context.roundedRectDifferentRadiusesPath(0, 0, w, h,
                    cornerRadius.upperLeft,
                    cornerRadius.upperRight,
                    cornerRadius.bottomLeft,
                    cornerRadius.bottomRight);
                context.clip();
                fwk.CrazyScope.pop();
            }

            var source = this.source();
            if (source){
                var displayMode = this.isNullSource() ? "stretch" : this.displayMode();
                switch (displayMode){
                    case "originalSize":
                        var imageL = 0;
                        var imageT = 0;
                        var sw = source.width();
                        var sh = source.height();

                        if (sw < w){
                            imageL = ~~(0 + (w - sw) / 2);
                        }
                        if (sh < h){
                            imageT = ~~(0 + (h - sh) / 2);
                        }

                        fwk.ImageSource.draw(source, context, imageL, imageT, sw, sh);
                        break;
                    case "stretch":
                        fwk.ImageSource.draw(source, context, 0, 0, w, h);
                        break;
                    default:
                        throw "Unknown image display mode " + displayMode;
                }
            }
        },
        isNullSource: function() {
            var source = this.source();
            return !source || !source.type;
        },
        dispose: function(){
            //var source = this.source();
            //if (source){
            //    source.loaded.unbind(this, onLoaded);
            //    source.dispose();
            //}

            UIElement.prototype.dispose.apply(this, arguments);
        }
    });

    fwk.ImageElement.PossibleValues = {originalSize:"Original size", stretch:"Stretch"};

    fwk.PropertyMetadata.extend("sketch.framework.UIElement", {
        "sketch.framework.ImageElement": {
            source: {
                displayName: "Source",
                useInModel: true,
                defaultValue:fwk.ImageSource.None()
            },
            cornerRadius: {
                displayName: "Corner radius",
                useInModel: true,
                defaultValue:QuadAndLock.Default
            },
            displayMode: {
                displayName: "Display mode",
                possibleValues: fwk.ImageElement.PossibleValues,
                useInModel: true,
                defaultValue:"stretch"
            },
            getNonRepeatableProps: function(element){
                var base = fwk.PropertyMetadata.findForType(UIElement).getNonRepeatableProps(element);
                return base.concat(["imageSource"]);
            }

        }
    });

    return fwk.ImageElement;
});
