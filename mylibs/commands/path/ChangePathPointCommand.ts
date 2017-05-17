import Command from "framework/commands/Command";
import Primitive from "framework/sync/Primitive";
import Invalidate from "framework/Invalidate";

export default class ChangePathPointCommand extends Command{
    [x: string]: any;

    constructor(path, point, originalPoint) {
        super();
        this._path = path;
        this._point = point;
        this._originalPoint = originalPoint;
        this._newPoint = clone(point);
    }
    execute() {
        var p = this._point,
            op = this._newPoint;

        p.x = op.x;
        p.y = op.y;
        p.cp1x = op.cp1x;
        p.cp1y = op.cp1y;
        p.cp2x = op.cp2x;
        p.cp2y = op.cp2y;
        Invalidate.request();
    }
    rollback() {
        var p = this._point,
            op = this._originalPoint;

        p.x = op.x;
        p.y = op.y;
        p.cp1x = op.cp1x;
        p.cp1y = op.cp1y;
        p.cp2x = op.cp2x;
        p.cp2y = op.cp2y;
        Invalidate.request();
    }
    toPrimitiveList(){
        return [Primitive.element_change(this._path)]
    }
}