define(["framework/commands/Command", "framework/sync/Primitive"], function(Command, Primitive){
    var fwk = sketch.framework;

return klass2("sketch.commands.ChangeColumnType", Command, {
    __name__: "ChangeColumnType",
    _constructor: function(selection, newType){
        this._index = selection._index;
        var cells = [];
        selection.each(function (cell) {
            cells.push(cell);
        });

        this._cells = cells;
        this._table = cells[0].parent();
        this._newType = newType;
        this._selection = selection;
    },

    canExecute: function(){
        return true;
    },
    execute: function(){
        this._table.changeColumnType( this._index, this._newType)
    },

    rollback: function(){
        this._table.removeColumn(this._index);
        this._table.insertColumn(this._index, this._cells[0].width(), this._cells);
    },
    toPrimitiveList:function(){
        return [
            Primitive.element_change(this._selection.parent())
        ];
    }
});
});