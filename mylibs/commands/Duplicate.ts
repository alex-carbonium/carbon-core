import Selection from "../framework/SelectionModel";

export default {
    run: function (selection) {
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
            while (!current.canAccept(children)){
                current = current.parent();
            }

            if (current === originalParent){
                current.insert(clone, element.zOrder() + 1);
            }
            else {
                clone.setTransform(current.globalMatrixToLocal(element.globalViewMatrix()));
                current.add(clone);
            }
            newSelection.push(clone);
        }
        Selection.makeSelection(newSelection);
    }
}