import Selection from "framework/SelectionModel";
import Environment from "environment";
import { ChangeMode } from "framework/Defs";
import { ILayer, IUIElement, IContainer, IIsolationLayer } from "carbon-core";
import { LayerTypes } from "carbon-app";

export default {
    run: function(elements:IUIElement[], clippingParent?: IUIElement){
        if(elements.length != 1 || !((elements[0] as IContainer).children instanceof Array)) {
            return;
        }

        var element = elements[0];

        var layer = Environment.view.getLayer(LayerTypes.Isolation) as IIsolationLayer;

        // re-read element form the model, since we can try isolate a copy from isolation layer
        element = App.Current.activePage.getElementById(element.id());
        layer.isolateGroup(element as IContainer, clippingParent);
        layer.invalidate();
    }
}
