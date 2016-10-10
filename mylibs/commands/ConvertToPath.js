import Selection from "framework/SelectionModel";

export default {
    run: function(elements, containerType){
        var newSelection = [];
        Selection.unselectAll();
        each(elements, function(element){
            var pathElement = element.convertToPath();
            newSelection.push(pathElement);
            var parent = element.parent();
            parent.replace(element, pathElement);
        });

        Selection.makeSelection(newSelection);
    }
}
