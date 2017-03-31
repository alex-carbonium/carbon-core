import Selection from "framework/SelectionModel";
import Environment from "environment";
import { ChangeMode } from "framework/Defs";
import { LayerTypes, ILayer } from "carbon-core";

export default {
    run: function(elements){
        var sorted = elements.slice().sort((a, b) => a.zOrder() - b.zOrder());
        var element = elements[0];
        var parent = element.parent();

        var layer:ILayer = Environment.view.getLayer(LayerTypes.Isolation);
        for (let i = 0, l = sorted.length; i < l; ++i) {
            let element = sorted[i];
            layer.add(element.clone());
            element.setProps({visible:false}, ChangeMode.Self);
        }
        layer.hitTransparent(false);
        layer.invalidate();
    }
}
