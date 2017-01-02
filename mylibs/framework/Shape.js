import Container from "./Container";
import ResizeDimension from "framework/ResizeDimension";
import PropertyMetadata from "framework/PropertyMetadata";
import Brush from "framework/Brush";
import ContextPool from "framework/render/ContextPool";
import {Types, StrokePosition} from "./Defs";
import Frame from "./Frame";
import Constraints from "./Constraints";

class Shape extends Container {

    mode(value) {
        return this.field("_mode", value, "resize");
    }

    closed() {
        return true;
    }

    _renderDraft(context, w, h) {
        var stroke = this.stroke();

        context.beginPath();
        this.drawPath(context, w, h);
        var dashPattern = this.dashPattern();
        if (dashPattern) {
            context.setLineDash(dashPattern);
        }
        Brush.fill(this.fill(), context, 0, 0, w, h);
        if (!stroke || !stroke.type || !stroke.position) {

            Brush.stroke(stroke, context, 0, 0, w, h);
        } else if (stroke.position === StrokePosition.Inside) {
            context.clip();
            Brush.stroke(stroke, context, 0, 0, w, h, 2);
        } else if (stroke.position === StrokePosition.Outside) {
            context.beginPath();
            context.rect(2 * w, -h, -3 * w, 3 * h);
            this.drawPath(context, w, h);
            context.clip();
            context.beginPath();
            this.drawPath(context, w, h);
            Brush.stroke(stroke, context, 0, 0, w, h, 2);
        }
    }

    _renderFinal(context, w, h, environment) {
        var stroke = this.stroke();

        context.beginPath();
        this.drawPath(context, w, h);
        Brush.fill(this.fill(), context, 0, 0, w, h);
        if (!stroke || !stroke.type || !stroke.position || !this.closed()) {
            Brush.stroke(stroke, context, 0, 0, w, h);
        } else {
            var clipingRect = this.getBoundingBoxGlobal(false, true);
            if (true || !environment.offscreen) {
                var p1 = environment.pageMatrix.transformPoint2(clipingRect.x, clipingRect.y);
                var p2 = environment.pageMatrix.transformPoint2(clipingRect.x + clipingRect.width, clipingRect.y + clipingRect.height);
                p1.x = Math.max(0, 0 | p1.x * environment.contextScale);
                p1.y = Math.max(0, 0 | p1.y * environment.contextScale);
                p2.x = 0 | p2.x * environment.contextScale + .5;
                p2.y = 0 | p2.y * environment.contextScale + .5;
                var sw = (p2.x - p1.x);
                var sh = (p2.y - p1.y);
            } else {
                sw = 0 | clipingRect.width * environment.contextScale + .5;
                sh = 0 | clipingRect.height * environment.contextScale + .5;
                p1 = {x: 0, y: 0};
            }
            sw = Math.max(sw, 1);
            sh = Math.max(sh, 1);

            var offContext = ContextPool.getContext(sw, sh, environment.contextScale);
            offContext.clearRect(0, 0, sw, sh);
            offContext.relativeOffsetX = -p1.x;
            offContext.relativeOffsetY = -p1.y;

            offContext.save();
            offContext.translate(-p1.x, -p1.y);
            environment.setupContext(offContext);

            var dashPattern = this.dashPattern();
            if (dashPattern) {
                offContext.setLineDash(dashPattern);
            }

            // if(!environment.offscreen) {
            this.globalViewMatrix().applyToContext(offContext);
            // }

            offContext.beginPath();
            this.drawPath(offContext, w, h);

            Brush.stroke(stroke, offContext, 0, 0, w, h, 2);
            if (stroke.position === StrokePosition.Inside) {
                offContext.globalCompositeOperation = "destination-in";
            } else {
                offContext.globalCompositeOperation = "destination-out";
            }
            offContext.fillStyle = "black";
            offContext.fill();

            // if(!environment.offscreen) {
            context.resetTransform();
            // }

            context.drawImage(offContext.canvas, p1.x, p1.y);

            offContext.restore();

            ContextPool.releaseContext(offContext);
        }
    }

    drawSelf(context, w, h, environment) {
//                var that = this;
//                var shadow = this.shadow();
//
//                shadow.apply(context, function(context){
//                    that.drawShape(context, x, y, w, h);
//                });

        context.save();

        context.lineCap = this.props.lineCap;
        context.lineJoin = this.props.lineJoin;
        context.miterLimit = this.props.miterLimit;

        var dashPattern = this.dashPattern();
        if (dashPattern) {
            context.setLineDash(dashPattern);
        }

        if (environment.finalRender) {
            this._renderFinal(context, w, h, environment);
        } else {
            this._renderDraft(context, w, h);
        }

        context.restore();
    }

    resizeDimensions() {
        return (this.mode() === "resize" ? ResizeDimension.Both : ResizeDimension.None);
    }

    canAccept(element, autoInsert, allowMoveInOut) {
        return (element instanceof Frame || element instanceof Shape) && allowMoveInOut;
    }

    lineCap(value) {
        if (arguments.length > 0) {
            this.setProps({lineCap: value});
        }

        return this.props.lineCap;
    }

    lineJoin(value) {
        if (arguments.length > 0) {
            this.setProps({lineJoin: value});
        }

        return this.props.lineJoin;
    }

    miterLimit(value) {
        if (arguments.length > 0) {
            this.setProps({miterLimit: value});
        }

        return this.props.mitterLimit;
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


    insert(frame) {
        var rect = this.getBoundaryRect();
        var parent = this.parent();
        var idx = parent.remove(this);
        this.setProps({clipMask: true, x: 0, y: 0, constraints: Constraints.All});

        frame.prepareAndSetProps({x: 0, y: 0, width: rect.width, height: rect.height, constraints: Constraints.All});
        frame.runtimeProps.resized = true;

        var group = new Container.GroupContainerType();
        group.add(this);
        group.setProps(rect);
        group.add(frame);
        parent.insert(group, idx);
    }
}
Shape.prototype.t = Types.Shape;

PropertyMetadata.registerForType(Shape, {
    fill: {
        defaultValue: Brush.White
    },
    stroke: {
        displayName: "Stroke",
        type: "stroke",
        defaultValue: Brush.Black
    },
    lineCap: {
        defaultValue: 'butt',
        type: "dropdown",
        displayName: '@lineCap',
        options: {
            size: 1 / 2,
            items: [
                {name: "@butt", value: 'butt'},
                {name: "@round", value: 'round'},
                {name: "@square", value: 'square'}
            ]
        },
    },
    lineJoin: {
        defaultValue: 'miter',
        type: "dropdown",
        displayName: '@lineJoin',
        options: {
            size: 1 / 2,
            items: [
                {name: "@miter", value: 'miter'},
                {name: "@bevel", value: 'bevel'},
                {name: "@round", value: 'round'}
            ]
        },
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
            items: [{name: "Don't round", value: 0}, {name: "Round to half pixels", value: 1}, {
                name: "Round to full pixels edges",
                value: 2
            }]
        },
        defaultValue: 1,
        useInModel: true,
        editable: true
    },
    groups () {
        return [
            {
                label: "Layout",
                properties: ["x", "y", "width", "height", "constraints", "angle"],
                expanded: true
            },
            {
                label: "Appearance",
                expanded: false,
                properties: ["visible", "opacity", "fill", "stroke", 'dashPattern', "cornerRadius", "clipMask"]
            },
            {
                label: "Settings",
                properties: ["pointRounding"],
                expanded: true
            }
        ];
    },
});

export default Shape;
