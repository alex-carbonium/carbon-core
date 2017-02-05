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

            element.parent().insert(clone, element.zOrder() + 1);
            newSelection.push(clone);
        }
        Selection.makeSelection(newSelection);
    }
}