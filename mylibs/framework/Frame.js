import Container from "./Container";
import FrameSource from "./FrameSource";
import PropertyMetadata from "./PropertyMetadata";
import Brush from "./Brush";
import {ContentSizing, Overflow, Types, ChangeMode} from "./Defs";
import Invalidate from "./Invalidate";
import FrameEditTool from "./FrameEditTool";
import EventHelper from "./EventHelper";
import RectMask from "./RectMask";

const DefaultSizing = ContentSizing.fill;

export default class Frame extends Container {
    iconType() {
        return 'icon';
    }

    prepareProps(changes) {
        super.prepareProps.apply(this, arguments);
        var source = changes.source || this.source();
        if (FrameSource.isEditSupported(source)) {
            var brChanged = changes.hasOwnProperty("br");
            if (changes.hasOwnProperty("sizing") || brChanged) {
                var oldRect = this.getBoundaryRect();
                var newRect = changes.br || oldRect;
                var sourcePropsChanged = changes.hasOwnProperty("sourceProps");
                var sourceProps = sourcePropsChanged ? changes.sourceProps : this.props.sourceProps;
                var runtimeSourceProps = sourcePropsChanged ? changes.sourceProps : this.runtimeProps.sourceProps;
                FrameSource.prepareProps(source, changes.sizing || this.sizing(), oldRect, newRect,
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
        if (FrameSource.isEditSupported(source)) {
            if (newProps.hasOwnProperty("sizing") || newProps.hasOwnProperty("br")) {
                FrameSource.resize(source, this.sizing(), this.getBoundaryRect(), this.runtimeProps.sourceProps);
            }
        }
        //this.createOrUpdateClippingMask(source, newProps);
    }

    saveOrResetLayoutProps(){
        if (!this.runtimeProps.origSource){
            this.runtimeProps.origSource = this.selectProps(["sourceProps"]);
        }
        else{
            this.setProps(this.runtimeProps.origSource);
        }
        super.saveOrResetLayoutProps();
    }

    clone() {
        var clone = super.clone();
        //to avoid loading when dragging
        clone.resetRuntimeProps();
        clone.runtimeProps.sourceProps = Object.assign({}, this.runtimeProps.sourceProps);
        clone.runtimeProps.loaded = this.runtimeProps.loaded;
        return clone;
    }

    source(value) {
        if (value !== undefined) {
            this.setProps({source: value});
        }
        return this.props.source;
    }

    sizing(value) {
        if (value !== undefined) {
            this.setProps({sizing: value});
        }
        return this.props.sizing;
    }

    fillBackground() {
        if (!FrameSource.isFillSupported(this.source())) {
            super.fillBackground.apply(this, arguments);
        }
    }

    strokeBorder() {
        if (!FrameSource.isFillSupported(this.source())) {
            super.strokeBorder.apply(this, arguments);
        }
    }

    shouldApplyViewMatrix(){
        return true;
    }

    drawSelf(context, w, h, environment) {
        var source = this.source();
        if (!source) {
            return;
        }

        context.save();

        if (!this.runtimeProps.loaded) {
            var promise = FrameSource.load(source, this.props.sourceProps);
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
                        this.createOrUpdateClippingMask(source, this.props);
                    }
                    FrameSource.resize(source, this.sizing(), this.getBoundaryRect(), this.runtimeProps.sourceProps);
                    Invalidate.request();
                });
            }
            this.runtimeProps.loaded = true;
        }

        if (this.runtimeProps.mask) {
            this.drawWithMask(context, this.runtimeProps.mask, 0, environment);
        }
        else {
            FrameSource.draw(source, context, w, h, this.props, this.runtimeProps.sourceProps);
        }

        context.restore();
    }

    renderAfterMask(context) {
        FrameSource.draw(this.source(), context, this.width(), this.height(), this.props, this.runtimeProps.sourceProps);
    }

    clipSelf() {
        return true;
        //TODO: add back if necessary
        //return this.globalViewMatrix().isTranslatedOnly();
    }

    //TODO: add back if necessary
    createOrUpdateClippingMask(source, newProps) {
        if(!source){
            return;
        }
        if (newProps.hasOwnProperty("angle") || newProps.hasOwnProperty("sourceProps")) {
            var shouldClip = FrameSource.shouldClip(source, this.width(), this.height(), this.runtimeProps.sourceProps);
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
            this.runtimeProps.mask.setProps({width: this.width(), height: this.height()}, ChangeMode.Self);
        }
    }

    dblclick() {
        var source = this.source();
        if (FrameSource.isEditSupported(source)) {
            FrameEditTool.attach(this);
        }
        else if (!FrameSource.hasValue(source)) {
            var e = {done: null};
            Frame.uploadRequested.raise(e);
            if (e.done) {
                e.done.then(urls => this.prepareAndSetProps({
                    sizing: DefaultSizing,
                    sourceProps: null,
                    source: FrameSource.createFromUrl(urls[0])
                }));
            }
        }
    }

    clipDragClone() {
        return true;
    }

    canAccept(elements, autoInsert, allowMoveInOut) {
        if (elements.length !== 1){
            return false;
        }
        return elements[0] instanceof Frame && allowMoveInOut;
    }

    canConvertToPath() {
        return !!this.props.sourceProps.svg;
    }

    convertToPath() {
        return fetch(this.props.sourceProps.svg, {cors: true})
            .then(response => {
                if (!(response.status >= 200 && response.status < 300)) {
                    throw new Error("Could not download vector");
                }
                return response.text();
            })
            .then(svg => {
                return svgParser.loadSVGFromString(svg).then((result)=> {
                    result.setProps({x: this.x(), y: this.y()});
                    return result;
                });
            });
    }

    insert(frame) {
        this.prepareAndSetProps({source: frame.props.source, sourceProps: frame.props.sourceProps});
        this.runtimeProps.sourceProps = frame.runtimeProps.sourceProps;
        frame.parent().remove(frame);
        frame.runtimeProps.resized = true;
        frame.runtimeProps.copiedFrame = this;
    }

    static uploadRequested = EventHelper.createEvent()
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
                {name: "Fit frame", value: ContentSizing.stretch},
                {name: "Manual", value: ContentSizing.manual}
            ]
        },
        defaultValue: DefaultSizing
    },
    overflow: {
        defaultValue: Overflow.Clip
    },
    prepareVisibility: function (props) {
        var base = PropertyMetadata.findForType(Container);
        return Object.assign({}, base, {
            sizing: FrameSource.isEditSupported(props.source)
        });
    },
    groups: function (element) {
        var ownGroups = [
            {
                label: element ? element.displayType() : '',
                properties: ["sizing"]
            }
        ];

        var baseGroups = PropertyMetadata.findForType(Container).groups();
        return ownGroups.concat(baseGroups);
    },
    getNonRepeatableProps: function (element) {
        var base = PropertyMetadata.findForType(Container).getNonRepeatableProps(element);
        return base.concat(["source"]);
    }
});
