import PropertyMetadata from "../../framework/PropertyMetadata";
import Brush from "../../framework/Brush";
import tinycolor from "tinycolor2";
import Guide from "./Guide";
import { Types } from "../../framework/Defs";
import UserSettings from "../../UserSettings";
import { IView, IContext, IArtboardProps, IRect, IGuide } from "carbon-core";

class CustomGuides extends Guide {
    constructor(view: IView) {
        super();
        this._view = view;
        this.capturedIndexX = -1;
        this.capturedIndexY = -1;
    }

    drawX(context: IContext, minx: number, height: number) {
        context.save();

        var scale = this._view.scale();
        context.globalAlpha *= this.opacity;
        context.beginPath();

        for (let i = 0; i < this.props.xs.length; ++i) {
            if (i !== this.capturedIndexX) {
                let x = this.props.xs[i].pos * scale - minx + .5 | 0;
                context.moveTo(x + .5, 0);
                context.lineTo(x + .5, height);
            }
        }

        Brush.stroke(this.stroke, context);

        context.restore();
    }

    drawY(context: IContext, miny: number, width: number) {
        context.save();

        var scale = this._view.scale();
        context.globalAlpha *= this.opacity;
        context.beginPath();

        for (let i = 0; i < this.props.ys.length; ++i) {
            if (i !== this.capturedIndexY) {
                let y = this.props.ys[i].pos * scale - miny + .5 | 0;
                context.moveTo(0, y + .5);
                context.lineTo(width, y + .5);
            }
        }

        Brush.stroke(this.stroke, context);

        context.restore();
    }

    prepareProps(props: ICustomGuidesProps) {
        if (props.guidesX && props.guidesY) {
            var xs = [];
            var ys = [];
            var snapPoints = { xs: [], ys: [] };
            for (let i = 0, l = props.guidesX.length; i < l; i++) {
                var gx = props.guidesX[i];
                xs.push(gx);

                snapPoints.xs.push(props.origin.x + gx.pos, props.origin.x + gx.pos + 1);
            }
            for (let i = 0, l = props.guidesY.length; i < l; i++) {
                var gy = props.guidesY[i];
                ys.push(gy);

                snapPoints.ys.push(props.origin.y + gy.pos, props.origin.y + gy.pos + 1);
            }
            props.xs = xs;
            props.ys = ys;
            props.snapPoints = snapPoints;
        }
        else {
            props.xs = [];
            props.ys = [];
            props.snapPoints = { xs: [], ys: [] };
        }
    }

    tryCaptureX(x: number) {
        this.capturedIndexX = this.findClosest(this.props.xs, x);
        if (this.capturedIndexX === -1) {
            return null;
        }
        return this.props.guidesX[this.capturedIndexX];
    }
    tryCaptureY(y: number) {
        this.capturedIndexY = this.findClosest(this.props.ys, y);
        if (this.capturedIndexY === -1) {
            return null;
        }
        return this.props.guidesY[this.capturedIndexY];
    }
    releaseCaptured() {
        this.capturedIndexX = -1;
        this.capturedIndexY = -1;
    }
    findClosest(values: any[], pos: number) {
        var scale = this._view.scale();
        var minDiff = Number.POSITIVE_INFINITY;
        var minIndex = -1;
        for (let i = 0, l = values.length; i < l; ++i) {
            let value = values[i].pos;
            let diff = Math.abs(value - pos) * scale;
            if (diff < minDiff) {
                minDiff = diff;
                minIndex = i;
            }
        }
        if (minDiff < 4) {
            return minIndex;
        }
        return -1;
    }

    static setDefaultStrokeHsl(hsl) {
        var strokeRgb = tinycolor(hsl).toRgbString();
        var strokeBrush = Brush.createFromColor(strokeRgb);
        var prototype = PropertyMetadata.getPropsPrototype(CustomGuides.prototype.t);
        prototype.stroke = strokeBrush;
    }

    static setDefaultOpacity(opacity) {
        var prototype = PropertyMetadata.getPropsPrototype(CustomGuides.prototype.t);
        prototype.opacity = opacity;
    }

    static getDefaultStrokeHsl() {
        var prototype = PropertyMetadata.getPropsPrototype(CustomGuides.prototype.t);
        var rgb = prototype.stroke.value;
        return tinycolor(rgb).toHsl();
    }
}
CustomGuides.prototype.t = Types.CustomGuide;

PropertyMetadata.registerForType(CustomGuides, {
    stroke: {
        defaultValue: Brush.createFromColor(UserSettings.guides.stroke)
    },
    opacity: {
        defaultValue: 1
    },
    xs: {
        defaultValue: []
    },
    ys: {
        defaultValue: []
    },
    snapPoints: {
        defaultValue: { xs: [], ys: [] }
    }
});

export default CustomGuides;

interface ICustomGuidesProps extends IArtboardProps {
    xs: IGuide[];
    ys: IGuide[];
    origin: IRect;
    snapPoints: { xs: number[], ys: number[] };
}