import ArrangeStrategy from "../framework/ArrangeStrategy";
import Artboard from "../framework/Artboard";
import Selection from "../framework/SelectionModel";

export default {
    run: function (selection) {
        if (!selection || selection.length === 0) {
            return;
        }
        var parents = [];
        
        for (var i = 0; i < selection.length; ++i) {            
            var element = selection[i];
            parents.push(element.parent());
            element.parent().remove(element);            
        }

        ArrangeStrategy.arrangeRoots(parents);
        
        var sameParent = true;
        var first = parents[0];
        for (let i = 1; i < parents.length; ++i){
            if (parents[i] !== first){
                sameParent = false;
                break;
            }
        }

        var newSelection = [];
        if (sameParent && !(first instanceof Artboard)){
            newSelection.push(first);
        }
        Selection.makeSelection(newSelection);
    }
}