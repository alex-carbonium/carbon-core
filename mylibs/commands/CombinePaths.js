import Command from "../framework/commands/Command";
import CompoundPath from "../ui/common/CompoundPath";
import Path from "ui/common/Path";
import Selection from "../framework/SelectionModel";

export default class CombinePaths extends Command {
    constructor(joinMode, elements){
        super();
        this._elements = elements;
        for(var i = 0; i < elements.length; ++i) {
            var e = elements[i];
            if(!(e instanceof Path) && !(e instanceof CompoundPath)){
                var path = e.convertToPath();
                var parent = e.parent();
                parent.replace(e, path);

                elements[i]=path;
            }
        }
        this._joinMode = joinMode;
    }

    execute(){
        var elements = this._elements.slice().sort((a, b) => a.zOrder() - b.zOrder());
        var path;
        var e0 = elements[0];
        var parent = e0.parent();
        if(e0 instanceof CompoundPath){
            //TODO: (m) check if this is correct
            path = e0;
            for(var i = 1; i < elements.length; ++i) {
                var e = elements[i];
                e.joinMode(this._joinMode);
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

            for(var i = 0; i < elements.length; ++i) {
                var e = elements[i];
                e.joinMode(this._joinMode);
                path.add(e);
            }
        }

        path.recalculate();
        Selection.makeSelection([path]);

    }
    toPrimitiveList(){
        return this.primitives;
    }
}
