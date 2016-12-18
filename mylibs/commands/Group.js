import Selection from "framework/SelectionModel";

export default {
    run: function(elements, containerType){
        var sorted = elements.slice().sort((a, b) => a.zOrder() - b.zOrder());
        var element = elements[0];
        var parent = element.parent();
        var group = new containerType();
        group.lockAutoresize();

        //var globalRect = element.getBoundingBoxGlobal();
        // var x1 = globalRect.x
        //     , y1 = globalRect.y
        //     , x2 = globalRect.width + x1
        //     , y2 = globalRect.height + y1;
        //
        // for (let i = 0, l = sorted.length; i < l; ++i) {
        //     let element = sorted[i];
        //     let globalRect = clone(element.getBoundingBoxGlobal());
        //
        //     if (globalRect.x < x1) x1 = globalRect.x;
        //     if (globalRect.y < y1) y1 = globalRect.y;
        //     if (globalRect.x + globalRect.width > x2) x2 = globalRect.x + globalRect.width;
        //     if (globalRect.y + globalRect.height > y2) y2 = globalRect.y + globalRect.height;
        // }

        // var pos = parent.global2local({x: x1, y: y1});
        // var rect = {x: pos.x, y: pos.y, width: x2 - x1, height: y2 - y1};
        // group.setProps(rect);
        App.Current.activePage.nameProvider.assignNewName(group);
        parent.insert(group, parent.children.indexOf(element));

        for (let i = 0, l = sorted.length; i < l; ++i) {
            let element = sorted[i];
            //let globalRect = clone(element.getBoundaryRectGlobal());
            //globalRect.x -= x1;
            //globalRect.y -= y1;

            group.insert(element, i);
            //element.setProps(globalRect);
        }

        group.performArrange();
        Selection.makeSelection([group]);
        group.unlockAutoresize();
        return group;
    }
}
