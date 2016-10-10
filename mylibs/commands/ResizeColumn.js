define(["framework/commands/Command", "framework/sync/Primitive"], function(Command){
    var fwk = sketch.framework;

    return klass2("sketch.commands.ResizeColumn", Command, {
        __name__: "ResizeColumn",
        _constructor: function(table, index, size, onlyOneColumn){
            this._index = index;
            this._table = table;
            this._size = size;
            this._onlyOneColumn = onlyOneColumn;
        },

        canExecute: function(){
            return true;
        },

        execute: function(){
            this._table.resizeColumn(this._index, this._size, this._onlyOneColumn);
        },

        rollback: function(){
            this._table.resizeColumn(this._index, -this._size, this._onlyOneColumn);
        },
        toPrimitiveList: function(){
            return [
                fwk.sync.Primitive.element_change(this._table)
            ];
        }
    });
});