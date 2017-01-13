import Selection from "framework/SelectionModel";

export default{
    run: function(elements){
        var allChildren = [];

        for (let i = 0, l = elements.length; i < l; ++i) {
            let group = elements[i];

            let parent = group.parent();
            let index = group.index();

            for (let i = group.children.length - 1; i >= 0; --i) {
                var e = group.children[i];
                var gm = e.globalViewMatrix();
                group.remove(e);
                parent.insert(e, index);
                e.setTransform(parent.globalViewMatrixInverted().appended(gm));
                allChildren.push(e);
            }

            parent.remove(group);
        }

        Selection.makeSelection(allChildren);
    }
}