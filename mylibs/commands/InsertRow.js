define(["framework/commands/Command", "framework/sync/Primitive"], function(Command){
    var fwk = sketch.framework;

    return klass2("sketch.commands.InsertRow", Command, {
        __name__: "InsertRow",
	    _constructor: function( table, index, height, style){
            this._index = index;
            this._table = table;
            this._height = height;
            this._style = style
    },
        canExecute: function(){
            return true;
        },

    execute: function(){
        this._table.insertRow(this._index, this._height);
        if (this._style){
            this._table.setRowStyle(this._index, this._style);
        }
    },

        rollback: function(){
            this._table.removeRow(this._index);
        },
        toPrimitiveList: function(){
            return [
                fwk.sync.Primitive.element_change(this._table)
            ];
        }
    });
});