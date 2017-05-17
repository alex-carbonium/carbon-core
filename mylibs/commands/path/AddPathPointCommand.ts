import Command from "framework/commands/Command";
import Primitive from "framework/sync/Primitive";

export default class AddPathPointCommand extends Command {
    [x: string]: any;

    constructor(path, point) {
        super();
        this._path = path;
        this._point = point;
        this._parent = path.parent();
        this._position = path.points.length;
    }
    transparent(){
        return true;
    }
    execute(){
        if(!this._path.points.length) {
            this._parent.add(this._path);
        }
        this._path.insertPointAtIndex(this._point, this._position);
    }
}