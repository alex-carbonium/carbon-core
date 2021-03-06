import ExtensionBase from "./ExtensionBase";
import DesignerView from "../framework/DesignerView";
import { LayerType, IView } from "carbon-app";
import GlobalMatrixModifier from "../framework/GlobalMatrixModifier";
import UserSettings from "../UserSettings";
import { RenderEnvironment } from "carbon-core";

function drawSnapLines(context, environment: RenderEnvironment) {
    var lines = this.view.snapController.snapLines;
    if (!lines.length) {
        return;
    }
    context.save();

    var scale = environment.scale;
    context.scale(1 / scale, 1 / scale);

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var x1 = Math.round(line.x1 * scale);
        var y1 = Math.round(line.y1 * scale);
        var x2 = Math.round(line.x2 * scale);
        var y2 = Math.round(line.y2 * scale);

        if (x1 === x2) {
            let p = .5 * Math.sign(x1);
            x1 += p;
            x2 += p;
        }
        else if (y1 === y2) {
            let p = .5 * Math.sign(y1);
            y1 += p;
            y2 += p;
        }

        context.strokeLine(x1, y1, x2, y2, 'cyan');
    }

    context.restore();
};

function drawSnapDistances(context, environment: RenderEnvironment) {
    var lines = this.view.snapController.distances;
    var that = this;
    if (!lines.length) {
        return;
    }
    context.save();

    var scale = environment.scale;
    context.scale(1 / scale, 1 / scale);
    var ids = {};
    var poss = {};

    lines.sort((a, b) => a.value - b.value);

    function drawLine(line) {
        if (!line.value) {
            return;
        }

        var posKey;
        if (line.vertical) {
            posKey = 'v' + Math.sign(line.y1 - line.y2);
        } else {
            posKey = 'h' + Math.sign(line.x1 - line.x2);
        }

        if (poss[posKey]) {
            return;
        }
        poss[posKey] = true;

        var x1 = Math.round(line.x1 * scale);
        var y1 = Math.round(line.y1 * scale);
        var x2 = Math.round(line.x2 * scale);
        var y2 = Math.round(line.y2 * scale);

        if (x1 === x2) {
            let p = .5 * Math.sign(x1);
            x1 += p;
            x2 += p;
        }
        else if (y1 === y2) {
            let p = .5 * Math.sign(y1);
            y1 += p;
            y2 += p;
        }

        if(line.temp && !line.solid) {
            context.setLineDash([1, 2]);
        } else {
            context.setLineDash([]);
        }
        context.beginPath();
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        if (line.d) {
            context.moveTo(x2 + .5, y2 + .5);
            if (line.vertical) {
                context.lineTo(x2 + line.d, y2 + .5);
            } else {
                context.lineTo(x2, y2 + line.d);
            }
        }

        context.stroke();
        textDistance(context, line, that.view, environment.scale);
    }

    context.strokeStyle = UserSettings.snapTo.distanceColor;
    var fontStyle = '9px Arial';
    context.font = fontStyle;
    context.fillStyle = UserSettings.snapTo.distanceColor;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (!line.temp) {
            drawLine(line);
        }
    }
    context.strokeStyle = UserSettings.frame.stroke;
    context.fillStyle = UserSettings.frame.stroke;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.temp) {
            drawLine(line);
        }
    }

    context.restore();
};

function textDistance(context, distance, view, scale) {
    GlobalMatrixModifier.pushPrependScale(view.scaleMatrix);

    context.save();

    let text = Math.round(distance.value).toString();

    let textWidth = context.measureText(text, context.font).width;
    if (distance.vertical) {
        context.textBaseline = 'middle';
        context.fillText(text, Math.round((distance.x1 * scale - textWidth - 4)), Math.round((Math.min(distance.y1, distance.y2) + distance.value / 2) * scale));
    } else {
        context.textBaseline = 'bottom';
        context.fillText(text, Math.round((Math.min(distance.x1, distance.x2) + distance.value / 2) * scale - textWidth / 2), Math.round((distance.y1 * scale - 4)));
    }

    context.restore();

    GlobalMatrixModifier.pop();
}

export default class SnapVisualization extends ExtensionBase {
    attach(app, view, controller) {
        super.attach.apply(this, arguments);
        if (view instanceof DesignerView) {
            view.registerForLayerDraw(LayerType.Interaction, this);
        }
    }

    detach() {
        super.detach.apply(this, arguments);
        this.view.unregisterForLayerDraw(LayerType.Interaction, this);
    }

    onLayerDraw(layer, context, environment: RenderEnvironment) {
        drawSnapLines.call(this, context, environment);
        drawSnapDistances.call(this, context, environment);
    }
}