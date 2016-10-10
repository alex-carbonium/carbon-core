define(["framework/commands/Command", "framework/sync/Primitive"], function(Command){
    var fwk = sketch.framework;
    return klass2("sketch.commands.SaveTemplate", Command, (function(){
        return {
            _constructor: function(view, element){
                this._view = view;
                this.element = element;
            },

            canExecute: function() {
                return this.element instanceof fwk.TemplatedElement;
            },
            execute: function(){
                Selection.makeSelection();
                this.element.save();
            },
            rollback: function(){
                this.element.edit();
            }
        }
    })());
});