import Selection from "framework/SelectionModel";

// TODO: move all commands to separate files
define(["framework/commands/Command", "framework/sync/Primitive"], function(Command, Primitive) {
    var fwk = sketch.framework,
        sync = fwk.sync;

    klass2("sketch.commands.Move", Command, {
        __name__: "Move",
        _constructor: function(element){
            if(!element)
                return;
            var selection = this._selection = [];
            this._element = element;

            element.each(function(el){
                  selection.push(el);
            });
            this._index = -1;
            this._originals = [];
            this.transparent(true);
        },
        init: function(direction, offset){
            this._offset = offset || 1;
            this._direction = direction;
            return this;
        },
        execute: function(){
            if (!this._selection || this._selection.length === 0){
                return false;
            }

            this._originals[++this._index] = this._selection.map(function(e){
                return {element: e, position: e.position() }
            });

            var that = this;
            var page = App.Current.activePage;

            this._element.each(function(e){
                var props = {};
                switch (that._direction) {
                    case "up":
                        props.y = (e.y() - that._offset );
                        break;
                    case "down":
                        props.y = (e.y() + that._offset );
                        break;
                    case "left":
                        props.x = (e.x() - that._offset );
                        break;
                    case "right":
                        props.x = (e.x() + that._offset );
                        break;
                }

                e.setProps(props);
            });
        },

        rollback: function(){
            var originalPositions = this._originals[this._index];
            var page = App.Current.activePage;

            originalPositions.forEach(function(e){
                e.element.setProps({x:e.position.x, y:e.position.y});
            });
            --this._index;
            Selection.makeSelection(this._selection);
        }
    });

    klass2("sketch.commands.FieldChanged", Command, {
        _constructor: function(element, field){
            this.element = element;
            this.field = field;
        },
        execute: function(){
            if (this.oldValue === undefined){
                this.oldValue = this.element[this.field.name]();
            }
            this.element[this.field.name](this.value);
        },
        rollback: function(){
            this.element[this.field.name](this.oldValue);
        }
    });

    return sketch.commands;
});
