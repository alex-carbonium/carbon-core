import ExtensionBase from "./ExtensionBase";
import DesignerView from "framework/DesignerView";
import SnapController from "framework/SnapController";


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
        var x1 = line.x1 * scale + 0.5 | 0;
        var y1 = line.y1 * scale + 0.5 | 0;
        var x2 = line.x2 * scale + 0.5 | 0;
        var y2 = line.y2 * scale + 0.5 | 0;

        context.strokeLine(x1, y1, x2, y2, 'red');
    }

    context.restore();
};

export default class SnapVisualization extends ExtensionBase {
    attach(app, view, controller) {
        super.attach.apply(this, arguments);
        if (view instanceof DesignerView) {
            view.registerForLayerDraw(2, this);
        }
    }

    onLayerDraw(layerIndex, context, environment) {
        drawSnapLines(context, environment);
    }
}