import Container from "./Container";
import GroupContainer from "./GroupContainer";
import PropertyMetadata from "./PropertyMetadata";
import Brush from "./Brush";
import Shadow from "./Shadow";
import ContextPool from "./render/ContextPool";
import { Types } from "./Defs";
import Constraints from "./Constraints";
import { IImage, IUIElement } from "carbon-model";
import { ResizeDimension, ElementState, RenderEnvironment, RenderFlags, StrokePosition, LineJoin, LineCap, Origin, ProxyDefinition } from "carbon-core";
import RenderPipeline from "./render/RenderPipeline";
import { ChangeMode } from "carbon-basics";
import UIElement from "./UIElement";

class Shape extends Container {
    convertToPath() {
        return null;
    }

    mode(value?) {
        return this.field("_mode", value, ElementState.Resize);
    }

    closed() {
        return true;
    }

    //for hit visibility
    lockedGroup() {
        return true;
    }

    allowColorOverride() {
        return true;
    }

    performArrange() {
    }

    _renderDraft(context, w, h, environment: RenderEnvironment) {
        var stroke = this.stroke;
        var strokePosition = this.strokePosition();

        context.beginPath();
        this.drawPath(context, w, h);
        var dashPattern = this.dashPattern();
        if (dashPattern) {
            context.setLineDash(dashPattern);
        }

        var strokeWidth = this.strokeWidth();

        this.fillSelf(context, w, h);
        this.drawInsetShadows(context, w, h, environment);

        if (strokeWidth) {
            if (!stroke || !stroke.type || strokePosition === StrokePosition.Center) {
                context.lineWidth = strokeWidth;
                this.strokeSelf(context, w, h);
            }
            else if (strokePosition === StrokePosition.Inside) {
                context.clip();
                context.lineWidth = strokeWidth * 2;
                this.strokeSelf(context, w, h);
            }
            else if (strokePosition === StrokePosition.Outside) {
                context.beginPath();
                var bb = this.getBoundingBoxGlobal();
                context.rect(bb.x + 2 * bb.width, bb.y - bb.height, -3 * bb.width, 3 * bb.height);
                this.drawPath(context, w, h);
                context.clip();
                context.beginPath();
                this.drawPath(context, w, h);
                context.lineWidth = strokeWidth * 2;
                this.strokeSelf(context, w, h);
            }
        }
    }

    fillSelf(context, w, h) {
        Brush.fill(this.fill, context, 0, 0, w, h);
    }

    strokeSelf(context, w, h) {
        Brush.stroke(this.stroke, context, 0, 0, w, h);
    }

    _renderFinal(context, w, h, environment: RenderEnvironment) {
        var stroke = this.stroke;
        var strokePosition = this.strokePosition();
        var strokeWidth = this.strokeWidth();

        var pipeline = RenderPipeline.createFor(this, context, environment);
        if (environment.flags & RenderFlags.DisableCaching) {
            pipeline.disableCache();
        }
        pipeline.applyMatrix(false);
        pipeline.out((context, environment) => {
            context.beginPath();
            this.drawPath(context, w, h);
            this.fillSelf(context, w, h);

            if (this.drawInsetShadows(context, w, h, environment)) {
                context.beginPath();
                this.drawPath(context, w, h);
            }
        });

        if (strokeWidth) {
            if (!stroke || !stroke.type || strokePosition === StrokePosition.Center || !this.closed()) {
                pipeline.out((context, environment) => {
                    context.lineWidth = strokeWidth;
                    var dashPattern = this.dashPattern();
                    if (dashPattern) {
                        context.setLineDash(dashPattern);
                    }
                    this.strokeSelf(context, w, h);
                })
            } else {
                pipeline.outBuffered((context, environment) => {
                    context.beginPath();
                    this.drawPath(context, w, h);

                    context.lineWidth = strokeWidth * 2;
                    var dashPattern = this.dashPattern();
                    if (dashPattern) {
                        context.setLineDash(dashPattern);
                    }
                    this.strokeSelf(context, w, h);
                    if (strokePosition === StrokePosition.Inside) {
                        context.globalCompositeOperation = "destination-in";
                    }
                    else {
                        context.globalCompositeOperation = "destination-out";
                    }
                    context.fillStyle = "black";
                    context.fill();
                });
            }
        }
        pipeline.done();
    }

    shouldApplyViewMatrix() {
        return true;
    }

    drawSelf(context, w, h, environment: RenderEnvironment) {
        this.drawOutsetShadows(context, w, h, environment);

        context.save();

        context.lineCap = this.lineCap;
        context.lineJoin = this.lineJoin;
        context.miterLimit = this.strokeWidth()*1.5//this.props.miterLimit;

        // if (environment.flags & RenderFlags.Final) {
        //     this._renderFinal(context, w, h, environment);
        // } else {
        //     this._renderDraft(context, w, h, environment);
        // }
        this._renderFinal(context, w, h, environment);

        context.restore();
    }

    expandRectWithShadow(rect) {
        var shadows = this.props.shadows;
        var hasShadow = false;
        let maxl = 0, maxt = 0, maxb = 0, maxr = 0;
        if (shadows && shadows.length) {
            for (var i = 0; i < shadows.length; ++i) {
                var shadow = shadows[i];
                if (!shadow.inset && shadow.enabled) {
                    let l = 0, r = 0, t = 0, b = 0;
                    if (shadow.x > 0) {
                        r += shadow.x;
                    } else {
                        l -= shadow.x;
                    }

                    if (shadow.y > 0) {
                        b += shadow.y;
                    } else {
                        t -= shadow.x;
                    }

                    let s = shadow.spread / 2 + shadow.blur;
                    l += s;
                    t += s;
                    r += s;
                    b += s;

                    maxl = Math.max(maxl, l);
                    maxt = Math.max(maxt, t);
                    maxr = Math.max(maxr, r);
                    maxb = Math.max(maxb, b);
                }
            }
        }

        if (maxl || maxt || maxb || maxr) {
            return rect.withMargins(maxl, maxt, maxr, maxb);
        }

        return rect;
    }


    drawOutsetShadows(context, w, h, environment: RenderEnvironment) {
        if (this.clipMask()) {
            return;
        }

        var shadows = this.props.shadows;
        var hasShadow = false;
        if (shadows && shadows.length) {
            for (var i = 0; i < shadows.length; ++i) {
                var shadow = shadows[i];
                if (!shadow.inset) {
                    Shadow.apply(this, shadow, context, w, h, environment);
                    hasShadow = true;
                }
            }
        }

        return hasShadow;
    }
    drawInsetShadows(context, w, h, environment: RenderEnvironment) {
        if (this.clipMask()) {
            return;
        }

        var shadows = this.props.shadows;
        var hasShadow = false;
        if (shadows && shadows.length) {
            for (var i = 0; i < shadows.length; ++i) {
                var shadow = shadows[i];
                if (shadow.inset) {
                    Shadow.apply(this, shadow, context, w, h, environment);
                    hasShadow = true;
                }
            }
        }

        return hasShadow;
    }

    drawPath(context, w, h) {
    }

    resizeDimensions(value?) {
        if (arguments.length === 1) {
            return super.resizeDimensions(value);
        }

        return this.isInEditMode() ? ResizeDimension.None : super.resizeDimensions();
    }

    isInEditMode(): boolean {
        return this.mode() === ElementState.Edit;
    }

    canRotate() {
        return !this.isInEditMode();
    }

    canAccept(elements, autoInsert?, allowMoveInOut?) {
        if (elements.length !== 1) {
            return false;
        }
        return this.primitiveRoot().isEditable() && (elements[0].systemType() === Types.Image) && allowMoveInOut;
    }

    get lineCap() {
        switch (this.props.lineCap) {
            case LineCap.Round:
                return 'round';
            case LineCap.Square:
                return 'square';
            default:
                return 'butt';
        }
    }
    set lineCap(value: LineCap | "round" | "square" | "butt") {
        let cap;
        if (value === 'round' || value === LineCap.Round) {
            cap = LineCap.Round;
        } else if (value === 'square' || value === LineCap.Square) {
            cap = LineCap.Square;
        } else {
            cap = LineCap.Butt;
        }

        this.setProps({ lineCap: cap });
    }

    set lineJoin(value: LineJoin | "round" | "bevel" | "miter") {
        if (value === 'round' || value === LineJoin.Round) {
            value = LineJoin.Round;
        } else if (value === 'bevel' || value === LineJoin.Bevel) {
            value = LineJoin.Bevel;
        } else {
            value = LineJoin.Miter;
        }

        this.setProps({ lineJoin: value });
    }
    get lineJoin() {
        switch (this.props.lineJoin) {
            case LineJoin.Round:
                return 'round';
            case LineJoin.Bevel:
                return 'bevel';
            default:
                return 'miter';
        }
    }

    get miterLimit() {
        return this.props.miterLimit;
    }

    set miterLimit(value) {
        this.setProps({ miterLimit: value });
    }

    _roundValue(value) {
        if (this.props.pointRounding === 0) {
            value = (0 | (value + 0.005) * 100) / 100;
        } else if (this.props.pointRounding === 1) {
            value = (0 | value * 2 + .5) / 2;
        } else {
            value = Math.round(value);
        }

        return value;
    }

    autoPositionChildren(): boolean {
        return true;
    }

    insert(element: IUIElement, index: number, mode?: ChangeMode): IUIElement {
        this.setProps({ clipMask: true });

        var parent = this.parent;
        var idx = parent.children.indexOf(this);
        var group = new GroupContainer();

        group.prepareAndSetProps(this.selectLayoutProps());

        element.resetTransform();
        let bbox1 = this.getBoundingBox();
        let bbox2 = element.getBoundingBox();
        element.applyScaling2(bbox1.width / bbox2.width, bbox1.height / bbox2.height, Origin.TopLeft);

        this.resetTransform();

        //first insert, so that group does not delete itself if this is a last child
        parent.insert(group, idx + 1);

        group.add(this);
        group.add(element);

        if (element.systemType() === Types.Image) {
            (element as IImage).resizeOnLoad(null);
        }

        return group;
    }

    skew(): void {
        var path = this.convertToPath();
        path.runtimeProps.ctxl = this.runtimeProps.ctxl;
        if (path) {
            (this.parent as any).replace(this, path);
        }
    }
}
Shape.prototype.t = Types.Shape;

PropertyMetadata.registerForType(Shape, {
    fill: {
        defaultValue: Brush.White,
        options: {
            gradient: true
        }
    },
    stroke: {
        defaultValue: Brush.Black
    },
    lineCap: {
        defaultValue: LineCap.Butt,
        type: "multiSwitch",
        displayName: '@lineCap',
        options: {
            size: 1 / 2,
            items: [
                { icon: "ico-prop_cap-cut", value: LineCap.Butt },//'butt'
                { icon: "ico-prop_cap-round", value: LineCap.Round },//'round'
                { icon: "ico-prop_cap-corner", value: LineCap.Square }//'square'
            ]
        },
    },
    lineJoin: {
        defaultValue: LineJoin.Miter,
        type: "multiSwitch",
        displayName: '@lineJoin',
        options: {
            size: 1 / 2,
            items: [
                { icon: "ico-prop_join-corner", value: LineJoin.Miter },
                { icon: "ico-prop_join-bevel", value: LineJoin.Bevel },
                { icon: "ico-prop_join-round", value: LineJoin.Round }
            ]
        },
    },
    shadows: {
        defaultValue: [],
        type: 'shadow',
        displayName: '@shadow'
    },
    miterLimit: {
        defaultValue: 10,
        displayName: "@miterLimit",
        type: "numeric"
    },
    pointRounding: {
        displayName: "Point rounding",
        type: "dropdown",
        options: {
            size: 1,
            items: [{ name: "Don't round", value: 0 }, { name: "Round to half pixels", value: 1 }, {
                name: "Round to full pixels edges",
                value: 2
            }]
        },
        defaultValue: 1,
        useInModel: true,
        editable: true
    },
    prepareVisibility: function (element: UIElement) {
        return {
            shadows: !element.clipMask()
        };
    },
    groups() {
        var baseGroups = PropertyMetadata.findAll(Types.Element).groups();

        return [
            baseGroups.find(x => x.id === "layout"),
            baseGroups.find(x => x.label === "@constraints"),
            {
                label: "Appearance",
                properties: ["opacity", "fill", "stroke"]
            },
            {
                label: "@shadow",
                properties: ["shadows"]
            },
            {
                label: "@advanced",
                properties: ["useInCode", "clipMask"]
            }
        ];
    },
    proxyDefinition(): ProxyDefinition {
        let baseDefinition = PropertyMetadata.findForType(Container).proxyDefinition();
        return {
            rprops: [].concat(baseDefinition.rprops), // readonly props
            props: ["lineCap", "lineJoin", "miterLimit"].concat(baseDefinition.props),
            methods: [].concat(baseDefinition.methods),
            mixins: [].concat(baseDefinition.mixins)
        }
    }
});

export default Shape;
