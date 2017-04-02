import Selection from "framework/SelectionModel";
import Environment from "environment";
import { ChangeMode } from "framework/Defs";
import { ILayer, IUIElement, IContainer, IIsolationLayer } from "carbon-core";
import { LayerTypes } from "carbon-app";

export default {
    run: function(elements:IUIElement[]){
        if(elements.length != 1 || !((elements[0] as IContainer).children instanceof Array)) {
            return;
        }

        var element = elements[0];

        var layer = Environment.view.getLayer(LayerTypes.Isolation) as IIsolationLayer;
        layer.isolateGroup(element as IContainer);
        layer.invalidate();
    }
}
