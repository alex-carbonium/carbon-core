import Command from "framework/commands/Command";
import Primitive from "framework/sync/Primitive";

export default class InsertPathPointCommand extends Command {
    [x: string]: any;

    constructor(path, pointInfo) {
       super();
       this._path = path;
       this._data = path.getInsertPointData(pointInfo);
   }
   toPrimitiveList(){
       if(this._data.length == 1) {
           var pt = this._data[0];
           return [Primitive.path_insert_point(this._path.id(), pt, pt.idx)];
       } else {
           var p1 = this._data[0];
           var p2 = this._data[1];
           var pt = this._data[2];
           return [Primitive.path_change_point(this._path.id(), p1, p1.idx),
                    Primitive.path_change_point(this._path.id(), p2, p2.idx),
                    Primitive.path_insert_point(this._path.id(), pt, pt.idx)];
       }
   }
}