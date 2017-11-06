import Selection from "../framework/SelectionModel";
import { ChangeMode } from "carbon-core";

export default {
    run: function (selection, changeMode = ChangeMode.Model, doNotUpdateSelection = false, zOrderDiff = 1) {
        if (!selection || selection.length === 0) {
            return;
        }

        var newSelection = [];
        for (var i = 0; i < selection.length; ++i) {
            var element = selection[i];
            var clone = element.clone();
            App.Current.activePage.nameProvider.assignNewName(clone);

            var originalParent = element.parent();
            var current = originalParent;
            var children = [clone];
            while (!current.canAccept(children, false, true)){
                current = current.parent();
            }

            if (current === originalParent){
                current.insert(clone, element.zOrder() + zOrderDiff, changeMode);
            }
            else {
                clone.setTransform(current.globalMatrixToLocal(element.globalViewMatrix()), changeMode);
                current.add(clone, changeMode);
            }
            newSelection.push(clone);
        }

        if(!doNotUpdateSelection) {
            Selection.makeSelection(newSelection);
        }

        return newSelection;
    }
}