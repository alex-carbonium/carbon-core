import Selection from "framework/SelectionModel";
import Promise from "bluebird";
import UIElement from "../framework/UIElement";

export default {
    run: function(elements, containerType){
        Selection.unselectAll();

        var promises = elements.map(function(element){
            var res = element.convertToPath();
            if (res instanceof UIElement){
                return Promise.resolve(res);
            }
            return res;
        });

        Promise.all(promises)
            .then(paths => elements.map((e, i) => {
                var parent = e.parent();
                var p = paths[i];
                parent.replace(e, p);
                p.setProps({width:e.width(), height:e.height()});
                return p;
            }))
            .then(paths => Selection.makeSelection(paths));
    }
}
