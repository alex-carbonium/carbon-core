define(["framework/commands/Command", "framework/sync/Primitive"], function(Command){
    var fwk = sketch.framework;

    return klass2("sketch.commands.InsertColumn", Command, {
        __name__: "InsertColumn",
    _constructor: function(table, index, width, style){
        this._index = index;
        this._table = table;
        this._width = width;
        this._style = style;
    },
        canExecute: function(){
            return true;
        },

    execute: function(){
        this._table.insertColumn(this._index, this._width);
        if (this._style){
            this._table.setColumnStyle(this._index, this._style);
        }
    },

        rollback: function(){
            this._table.removeColumn(this._index);
        },
        toPrimitiveList: function(){
            return [
                fwk.sync.Primitive.element_change(this._table)
            ];
        }
    });
});