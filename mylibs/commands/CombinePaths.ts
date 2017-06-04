import Command from "../framework/commands/Command";
import CompoundPath from "framework/CompoundPath";
import Path from "framework/Path";
import Selection from "../framework/SelectionModel";

export default class CombinePaths {
    static convertToPaths(elements) {
        for (var i = 0; i < elements.length; ++i) {
            var e = elements[i];
            if (!(e instanceof Path) && !(e instanceof CompoundPath)) {
                var path = e.convertToPath();
                var parent = e.parent();
                parent.replace(e, path);

                elements[i] = path;
            }
        }
    }

    static run(joinMode, elements) {
        var elements = elements.slice().sort((a, b) => a.zOrder() - b.zOrder());
        CombinePaths.convertToPaths(elements);
        var path;
        var e0 = elements[0];
        var parent = e0.parent();
        if (e0 instanceof CompoundPath) {
            //TODO: (m) check if this is correct
            path = e0;
            for (let i = 1; i < elements.length; ++i) {
                let e = elements[i];
                e.joinMode(joinMode);
                path.add(e);
            }

        } else {
            path = new CompoundPath();
            App.Current.activePage.nameProvider.assignNewName(path);

            path.fill(e0.fill());
            path.stroke(e0.stroke());
            path.name(e0.displayName());
            path.styleId(e0.styleId());

            parent.insert(path, parent.positionOf(e0));

            for (let i = 0; i < elements.length; ++i) {
                let e = elements[i];
                e.joinMode(joinMode);
                path.add(e);
            }
        }

        path.recalculate();
        Selection.makeSelection([path]);
    }
}
