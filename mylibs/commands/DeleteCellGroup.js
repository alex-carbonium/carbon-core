define(["framework/commands/Command", "framework/SelectionModel", "framework/sync/Primitive"], function(Command, Selection){
    var fwk = sketch.framework;

    return klass2("sketch.commands.DeleteCellGroup", Command, {
        __name__: "DeleteCellGroup",
        _constructor: function(app, page, selection){
            this._app = app;
            this._orientation = selection[0]._orientation;
            this._index = selection[0]._index;
            var cells = [];
            selection[0].each(function(cell){
                cells.push(cell);
            });

            this._cells = cells;
            this._selection = selection[0];
        },

        canExecute: function(){
            return true;
        },
        removeTable: function(table){
            this._parentContainer = table.parent();
            this._parentContainer.remove(table);
        },
        execute: function(){
            if (Selection.isElementSelected(this._selection)){
                Selection.clearSelection();
                var resetSelection = true;
            }
            var parent = this._selection.parent();
            if (!(parent === NullContainer)){
                this._parent = parent;
                var removedTable = false;
                if (this._orientation === 'vertical'){
                    if (parent.columnsCount() === 1){
                        this.removeTable(parent);
                        removedTable = true;
                    }
                    else{
                        parent.removeColumn(this._selection._index);
                    }
                } else{
                    if (parent.rowsCount() === 1){
                        this.removeTable(parent);
                        removedTable = true;
                    }
                    else{
                        parent.removeRow(this._selection._index);
                    }
                }
                if (!removedTable && resetSelection){
                    Selection.makeSelection([parent]);
                }
            }
        },

        rollback: function(){
            if (this._app.activePage !== this._page){
                this._app.setActivePage(this._page);
            }

            var parent = this._parent;
            if (this._parentContainer){
                this._parentContainer.add(parent);
                Selection.makeSelection([parent]);
            }
            else{
                if (this._orientation === 'vertical'){
                    parent.insertColumn(this._index, this._cells[0].width(), this._cells);
                } else{
                    parent.insertRow(this._index, this._cells[0].height(), this._cells);
                }

                var group = new sketch.ui.common.CellGroup(this._orientation, this._index, this._cells);
                group.parent(this._parent);
                Selection.makeSelection([group]);
            }
        },
        toPrimitiveList: function(){
            return [
                fwk.sync.Primitive.element_change(this._selection.parent())
            ];
        }
    });
});