import Container from "./Container";
import GroupContainer from "./GroupContainer";
import PropertyMetadata from "./PropertyMetadata";
import Brush from "./Brush";
import Shadow from "./Shadow";
import ContextPool from "./render/ContextPool";
import { Types, StrokePosition, LineCap, LineJoin } from "./Defs";
import Image from "./Image";
import Constraints from "./Constraints";
import { IImage, IUIElement } from "carbon-model";
import { ResizeDimension, ElementState, RenderEnvironment, RenderFlags } from "carbon-core";
import RenderPipeline from "./render/RenderPipeline";

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

    performArrange() {
    }

    _renderDraft(context, w, h, environment: RenderEnvironment) {
        var stroke = this.stroke();
        var strokePosition = this.strokePosition();

        context.beginPath();
        this.drawPath(context, w, h);
        var dashPattern = this.dashPattern();
        if (dashPattern) {
            context.setLineDash(dashPattern);
        }

        this.fillSelf(context, w, h);
        this.drawInsetShadows(context, w, h, environment);

        if (!stroke || !stroke.type || strokePosition === StrokePosition.Center) {
            context.lineWidth = this.strokeWidth();
            this.strokeSelf(context, w, h);
        }
        else if (strokePosition === StrokePosition.Inside) {
            context.clip();
            context.lineWidth = this.strokeWidth() * 2;
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
            context.lineWidth = this.strokeWidth() * 2;
            this.strokeSelf(context, w, h);
        }
    }

    fillSelf(context, w, h) {
        Brush.fill(this.fill(), context, 0, 0, w, h);
    }

    strokeSelf(context, w, h) {
        Brush.stroke(this.stroke(), context, 0, 0, w, h);
    }

    _renderFinal(context, w, h, environment: RenderEnvironment) {
        var stroke = this.stroke();
        var strokePosition = this.strokePosition();

        var pipeline = RenderPipeline.createFor(this, context, environment);
        pipeline.out((context)=>{
            context.beginPath();
            this.drawPath(context, w, h);
            this.fillSelf(context, w, h);

            if(this.drawInsetShadows(context, w, h, environment)) {
                context.beginPath();
                this.drawPath(context, w, h);
            }
        });

        if (!stroke || !stroke.type || strokePosition === StrokePosition.Center) {
            pipeline.out(context=>{
                context.lineWidth = this.strokeWidth();
                this.strokeSelf(context, w, h);
            })
        } else {
            pipeline.outBuffered(context=>{
                context.beginPath();
                this.drawPath(context, w, h);

                context.lineWidth = this.strokeWidth() * 2;
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
        pipeline.done();
        // context.beginPath();
        // this.drawPath(context, w, h);
        // this.fillSelf(context, w, h);

        // if (!stroke || !stroke.type || strokePosition === StrokePosition.Center || !this.closed()) {
        //     context.lineWidth = this.strokeWidth();
        //     this.strokeSelf(context, w, h);
        // }
        // else {
        //     var clippingRect = this.getBoundingBoxGlobal();
        //     clippingRect = this.expandRectWithBorder(clippingRect);
        //     if (true || !(environment.flags & RenderFlags.Offscreen)) {
        //         var p1 = environment.pageMatrix.transformPoint2(clippingRect.x, clippingRect.y);
        //         var p2 = environment.pageMatrix.transformPoint2(clippingRect.x + clippingRect.width, clippingRect.y + clippingRect.height);
        //         p1.x = Math.max(0, 0 | p1.x * environment.contextScale);
        //         p1.y = Math.max(0, 0 | p1.y * environment.contextScale);
        //         p2.x = 0 | p2.x * environment.contextScale + .5;
        //         p2.y = 0 | p2.y * environment.contextScale + .5;
        //         var sw = (p2.x - p1.x);
        //         var sh = (p2.y - p1.y);
        //     }
        //     // else {
        //     //     sw = 0 | clippingRect.width * environment.contextScale + .5;
        //     //     sh = 0 | clippingRect.height * environment.contextScale + .5;
        //     //     p1 = {x:0, y:0};
        //     // }
        //     sw = Math.max(sw, 1);
        //     sh = Math.max(sh, 1);

        //     var offContext = ContextPool.getContext(sw, sh, environment.contextScale);
        //     offContext.clearRect(0, 0, sw, sh);
        //     offContext.relativeOffsetX = -p1.x;
        //     offContext.relativeOffsetY = -p1.y;

        //     offContext.save();
        //     offContext.translate(-p1.x, -p1.y);
        //     environment.setupContext(offContext);

        //     // if(!(environment.flags & RenderFlags.Offscreen)) {
        //     this.applyViewMatrix(offContext);
        //     // }

        //     var dashPattern = this.dashPattern();
        //     if (dashPattern) {
        //         offContext.setLineDash(dashPattern);
        //     }

        //     offContext.beginPath();
        //     this.drawPath(offContext, w, h);

        //     offContext.lineWidth = this.strokeWidth() * 2;
        //     this.strokeSelf(offContext, w, h);
        //     if (strokePosition === StrokePosition.Inside) {
        //         offContext.globalCompositeOperation = "destination-in";
        //     }
        //     else {
        //         offContext.globalCompositeOperation = "destination-out";
        //     }
        //     offContext.fillStyle = "black";
        //     offContext.fill();

        //     // if(!(environment.flags & RenderFlags.Offscreen)) {
        //     context.resetTransform();
        //     // }

        //     context.drawImage(offContext.canvas, p1.x, p1.y);

        //     offContext.restore();

        //     ContextPool.releaseContext(offContext);
        // }
    }

    shouldApplyViewMatrix() {
        return true;
    }

    drawSelf(context, w, h, environment: RenderEnvironment) {
        this.drawOutsetShadows(context, w, h, environment);

        context.save();

        context.lineCap = this.lineCap();
        context.lineJoin = this.lineJoin();
        context.miterLimit = this.props.miterLimit;

        var dashPattern = this.dashPattern();
        if (dashPattern) {
            context.setLineDash(dashPattern);
        }

        if (environment.flags & RenderFlags.Final) {
            this._renderFinal(context, w, h, environment);
        } else {
            this._renderDraft(context, w, h, environment);
        }

        context.restore();
    }

    drawOutsetShadows(context, w, h, environment: RenderEnvironment) {
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
        return this.primitiveRoot().isEditable() && (elements[0] instanceof Image) && allowMoveInOut;
    }

    lineCap(value?) {
        if (arguments.length > 0) {
            if (value === 'round' || value === LineCap.Round) {
                value = LineCap.Round;
            } else if (value === 'square' || value === LineCap.Square) {
                value = LineCap.Square;
            } else {
                value = LineCap.Butt;
            }
            this.setProps({ lineCap: value });
        }

        switch (this.props.lineCap) {
            case LineCap.Round:
                return 'round';
            case LineCap.Square:
                return 'square';
            default:
                return 'butt';
        }
    }

    lineJoin(value?) {
        if (arguments.length > 0) {
            if (value === 'round' || value === LineJoin.Round) {
                value = LineJoin.Round;
            } else if (value === 'bevel' || value === LineJoin.Bevel) {
                value = LineJoin.Bevel;
            } else {
                value = LineJoin.Miter;
            }
            this.setProps({ lineJoin: value });
        }

        switch (this.props.lineJoin) {
            case LineJoin.Round:
                return 'round';
            case LineJoin.Bevel:
                return 'bevel';
            default:
                return 'miter';
        }
    }

    miterLimit(value) {
        if (arguments.length > 0) {
            this.setProps({ miterLimit: value });
        }

        return this.props.miterLimit;
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

    insert(element: IUIElement) {
        this.setProps({ clipMask: true });

        var parent = this.parent();
        var idx = parent.children.indexOf(this);
        var group = new GroupContainer();

        group.prepareAndSetProps(this.selectLayoutProps());
        element.resetTransform();
        this.resetTransform();

        //first insert, so that group does not delete itself if this is a last child
        parent.insert(group, idx + 1);

        group.add(this);
        group.add(element);

        if (element instanceof Image) {
            element.resizeOnLoad(null);
        }

        return group;
    }

    skew(): void {
        var path = this.convertToPath();
        path.runtimeProps.ctxl = this.runtimeProps.ctxl;
        if (path) {
            this.parent().replace(this, path);
        }
    }
}
Shape.prototype.t = Types.Shape;

PropertyMetadata.registerForType(Shape, {
    fill: {
        defaultValue: Brush.White,
        options: {
            gradient:true
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
    groups() {
        var baseGroups = PropertyMetadata.findAll(Types.Element).groups();

        return [
            baseGroups.find(x => x.label === "Layout"),
            baseGroups.find(x => x.label === "@constraints"),
            {
                label: "Appearance",
                properties: ["fill", "stroke", "strokeWidth", "strokePosition", "dashPattern", "miterLimit", "lineCap", "lineJoin", "opacity"]
            },
            {
                label: "@shadow",
                properties: ["shadows"]
            },
            {
                label: "@advanced",
                properties: ["clipMask"]
            }
        ];
    },
});

export default Shape;
