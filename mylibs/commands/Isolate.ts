import Selection from "framework/SelectionModel";
import Environment from "environment";
import { ChangeMode } from "framework/Defs";
import { LayerTypes } from "carbon-core";

export default {
    run: function(elements){
        var sorted = elements.slice().sort((a, b) => a.zOrder() - b.zOrder());
        var element = elements[0];
        var parent = element.parent();


        for (let i = 0, l = sorted.length; i < l; ++i) {
            let element = sorted[i];
            element.setProps({visible:false}, ChangeMode.Self);
            var layer = Environment.view.getLayer(LayerTypes.Isolation);
            layer.add(element.clone());
        }
    }
}
