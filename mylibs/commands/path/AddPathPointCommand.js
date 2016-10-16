import Command from "framework/commands/Command";
import Primitive from "framework/sync/Primitive";

export default klass2("sketch.commands.AddPathPointCommand", Command, {
    __name__: "AddPathPointCommand",
    _constructor: function(path, point) {
        this._path = path;
        this._point = point;
        this._parent = path.parent();
        this._position = path.points.length;
    },
    transparent:function(){
        return true;
    },
    execute:function(){
        if(!this._path.points.length) {
            this._parent.add(this._path);
        }
        this._path.insertPointAtIndex(this._point, this._position);
    }
});