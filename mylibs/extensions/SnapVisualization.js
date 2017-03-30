import ExtensionBase from "./ExtensionBase";
import DesignerView from "framework/DesignerView";
import SnapController from "framework/SnapController";
import {LayerTypes} from "framework/Defs";


function drawSnapLines(context, environment) {

    var lines = SnapController.snapLines;
    if(!lines.length){
        return;
    }
    context.save();

    var scale = environment.view.scale();
    context.scale(1 / scale, 1 / scale);
    context.setLineDash([4, 2]);

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var x1 = Math.round(line.x1 * scale);
        var y1 = Math.round(line.y1 * scale);
        var x2 = Math.round(line.x2 * scale);
        var y2 = Math.round(line.y2 * scale);

        if (x1 === x2){
            let p = .5 * Math.sign(x1);
            x1 += p;
            x2 += p;
        }
        else if (y1 === y2){
            let p = .5 * Math.sign(y1);
            y1 += p;
            y2 += p;
        }

        context.strokeLine(x1, y1, x2, y2, 'red');
    }

    context.restore();
};

export default class SnapVisualization extends ExtensionBase {
    attach(app, view, controller) {
        super.attach.apply(this, arguments);
        if (view instanceof DesignerView) {
            view.registerForLayerDraw(LayerTypes.Interaction, this);
        }
    }

    detach() {
        super.detach.apply(this, arguments);
        view.unregisterForLayerDraw(LayerTypes.Interaction, this);
    }

    onLayerDraw(layer, context, environment) {
        drawSnapLines(context, environment);
    }
}