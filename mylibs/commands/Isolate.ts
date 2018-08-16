import Selection from "../framework/SelectionModel";
import { ILayer, IUIElement, IContainer, IIsolationLayer, IIsolatable } from "carbon-core";
import { LayerType, IView } from "carbon-app";

const Isolate = {
    run: function(view:IView, elements:IIsolatable[], clippingParent: IUIElement = null){
        if(elements.length !== 1 || !((elements[0] as IContainer).children instanceof Array)) {
            return;
        }

        var element = elements[0];

        var layer = view.getLayer(LayerType.Isolation) as IIsolationLayer;

        // re-read element form the model, since we can try isolate a copy from isolation layer
        element = App.Current.activePage.getElementById(element.id);
        layer.isolateGroup(element, clippingParent);
        layer.invalidate();
    }
}

export default Isolate;