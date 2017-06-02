import Command from "framework/commands/Command";
import Primitive from "framework/sync/Primitive";
import Selection from "framework/SelectionModel";
import Invalidate from "framework/Invalidate";

export default class RemovePathPointCommand extends Command {
    [x: string]: any;

    constructor(path, point) {
        super();
        this._path = path;
        this._point = point;
        this._idx = this._path.indexOfPoint(point);
        this._parent = path.parent();
    }
    execute() {
        this._path.removePointAtIndex(this._idx);
        if(this._path.length() === 0){
            Selection.unselectAll();
            this._parent.remove(this._path);
        }
        this._created = false;
        Invalidate.request();
    }
    transparent(){
        return true;
    }
}