define(["framework/commands/Command", "framework/sync/Primitive"], function(Command){
    var fwk = sketch.framework;

    return klass2("sketch.commands.ResizeRow", Command, {
        __name__: "ResizeRow",
        _constructor: function(table, index, size, resizeOnlyOne){
            this._index = index;
            this._table = table;
            this._size = size;
            this._resizeOnlyOne = resizeOnlyOne;
        },

        canExecute: function(){
            return true;
        },

        execute: function(){
            this._table.resizeRow(this._index, this._size, this._resizeOnlyOne);
        },

        rollback: function(){
            this._table.resizeRow(this._index, -this._size, this._resizeOnlyOne);
        },
        toPrimitiveList: function(){
            return [
                fwk.sync.Primitive.element_change(this._table)
            ];
        }
    });
});