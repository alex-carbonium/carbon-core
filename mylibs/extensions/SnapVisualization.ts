import ExtensionBase from "./ExtensionBase";
import DesignerView from "framework/DesignerView";
import SnapController from "framework/SnapController";
import { LayerTypes } from "carbon-app";
import GlobalMatrixModifier from "../framework/GlobalMatrixModifier";
import Environment from "environment";
import UserSettings from "UserSettings";

function drawSnapLines(context, environment) {
    var lines = SnapController.snapLines;
    if (!lines.length) {
        return;
    }
    context.save();

    var scale = environment.view.scale();
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

function drawSnapDistances(context, environment) {
    var lines = SnapController.distances;
    if (!lines.length) {
        return;
    }
    context.save();

    var scale = environment.view.scale();
    context.scale(1 / scale, 1 / scale);
    var ids = {};
    var poss = {};

    lines.sort((a,b)=>a.value - b.value);

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (!line.value) {
            continue;
        }
        // ids[line.id] = true;

        var posKey;//line.x1 + ':' + line.y1 + line.vertical.toString();
        if(line.vertical) {
            posKey = 'v' + Math.sign(line.y1 - line.y2);
        } else {
            posKey = 'h' + Math.sign(line.x1 - line.x2);
        }

        if(poss[posKey]) {
            continue;
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

        context.strokeLine(x1, y1, x2, y2, UserSettings.snapTo.distanceColor);
        textDistance(context, line);
    }

    context.restore();
};

function textDistance(context, distance) {
    var scale = Environment.view.scale();
    var fontStyle = '9px Arial';

    GlobalMatrixModifier.pushPrependScale();

    context.save();

    context.font = fontStyle;
    context.fillStyle = UserSettings.snapTo.distanceColor;
    let text = Math.round(distance.value).toString();

    let textWidth = context.measureText(text, fontStyle).width;
    if (distance.vertical) {
        context.textBaseline = 'middle';
        context.fillText(text, Math.round((distance.x1* scale - textWidth - 4) ), Math.round((Math.min(distance.y1, distance.y2) + distance.value / 2) * scale));
    } else {
        context.textBaseline = 'bottom';
        context.fillText(text, Math.round((Math.min(distance.x1, distance.x2) + distance.value / 2) * scale - textWidth/2), Math.round((distance.y1* scale - 4) ));
    }

    context.restore();

    GlobalMatrixModifier.pop();
}

export default class SnapVisualization extends ExtensionBase {
    attach(app, view, controller) {
        super.attach.apply(this, arguments);
        if (view instanceof DesignerView) {
            view.registerForLayerDraw(LayerTypes.Interaction, this);
        }
    }

    detach() {
        super.detach.apply(this, arguments);
        this.view.unregisterForLayerDraw(LayerTypes.Interaction, this);
    }

    onLayerDraw(layer, context, environment) {
        drawSnapLines(context, environment);
        drawSnapDistances(context, environment);
    }
}