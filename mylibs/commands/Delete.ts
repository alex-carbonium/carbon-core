import Artboard from "../framework/Artboard";
import Selection from "../framework/SelectionModel";
import ExtensionPoint from "../framework/ExtensionPoint";
import NullContainer from "../framework/NullContainer";

export default {
    run: function (selection) {
        if (!selection || selection.length === 0) {
            return;
        }

        Selection.clearSelection();
        for (var i = 0; i < selection.length; ++i) {
            var element = selection[i];
            ExtensionPoint.invoke(element, 'delete', []);
        }
    }
}