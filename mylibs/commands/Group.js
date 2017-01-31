import Selection from "framework/SelectionModel";

export default {
    run: function(elements, containerType){
        var sorted = elements.slice().sort((a, b) => a.zOrder() - b.zOrder());
        var element = elements[0];
        var parent = element.parent();
        var group = new containerType();

        App.Current.activePage.nameProvider.assignNewName(group);
        parent.insert(group, parent.children.indexOf(sorted[sorted.length - 1]));

        for (let i = 0, l = sorted.length; i < l; ++i) {
            let element = sorted[i];
            group.insert(element, i);
        }

        group.performArrange();
        Selection.makeSelection([group]);
        return group;
    }
}
