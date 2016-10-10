import Selection from "framework/SelectionModel";

define(["framework/commands/Command", "framework/sync/Primitive"], function(Command){
    var fwk = sketch.framework;
    return klass2("sketch.commands.DecomposeTemplate", Command, (function(){
        return {
            __name__: "DecomposeTemplate",
            _constructor: function(view, element){
                this._view = view;
                this.element = element;
            },

            execute: function(){
                Selection.unselectAll();

                var element = this.element;
                var parent = element.parent();

                var newSelection = [];
                element.getChildren().each(function(i, e){
                    var clone = e.clone();

                    clone.setProps({
                        x: element.x() + clone.x(),
                        y: element.y() + clone.y()
                    });

                    newSelection.push(clone);
                });

                parent.remove(element);
                each(newSelection, function(e){
                    parent.add(e);
                });

                Selection.makeSelection(newSelection);
                this.parent = parent;
                this.selection = newSelection;
            },

            rollback: function(){
                Selection.unselectAll();

                each(this.selection, function(e){
                    e.parent().remove(e);
                });

                this.parent.add(this.element);
                Selection.makeSelection([this.element]);
            },
            toPrimitiveList:function(rollback) {
                var res;
                if(rollback) {
                    res = [fwk.sync.Primitive.element_new(this.element)];
                    each(this.selection, function (e) {
                        res.push(fwk.sync.Primitive.element_delete(e));
                    });
                } else {
                    res = [fwk.sync.Primitive.element_delete(this.element)];
                    each(this.selection, function (e) {
                        res.push(fwk.sync.Primitive.element_new(e));
                    });
                }

                return res;
            }
        }
    })());
});
