define(["framework/commands/Command", "framework/sync/Primitive"], function(Command){
    var fwk = sketch.framework;
    return klass2("sketch.commands.CreateTemplate", Command, (function(){
        return {
            __name__: "CreateTemplate",
            _constructor: function(view, selection){
                this._view = view;
                this.selection = selection;
            },

            execute: function(){
                var template = fwk.Resources.createTemplate();
                var templatedElement = new fwk.TemplatedElement();
                templatedElement.assignTemplate(template);

                Selection.unselectAll();

                var elements = this.selection;

                var parent = this.selection[0].parent();
                var minX = sketch.util.min(this.selection, function(x){ return x.x(); });
                var maxX = sketch.util.max(this.selection, function(x){ return x.right(); });
                var minY = sketch.util.min(this.selection, function(x){ return x.y(); });
                var maxY = sketch.util.max(this.selection, function(x){ return x.bottom(); });

                templatedElement.x(minX);
                templatedElement.y(minY);

                parent.add(templatedElement);

                templatedElement.edit();

                templatedElement.width(maxX - minX, true);
                templatedElement.height(maxY - minY, true);

                each(elements, function(e){
                    var clone = e.clone();
                    var global = e.getBoundaryRectGlobal();
                    var position = templatedElement.global2local(global);

                    clone.position(position);
                    templatedElement.add(clone);
                });

                each(this.selection, function(e){
                    e.parent().remove(e);
                });

                template.sourceElement = templatedElement;
                templatedElement.save();

                Selection.makeSelection([templatedElement]);
                this.element = templatedElement;
                this.parent = parent;
            },
            rollback: function(){
                var that = this;
                Selection.unselectAll();

                this.parent.remove(this.element);
                each(this.selection, function(e){
                    that.parent.add(e);
                });

                var template = this.element.getTemplate();
                this._templateId = template.templateId();
                fwk.Resources.removeTemplate(template);

                Selection.makeSelection(this.selection);
            },
            toPrimitiveList:function(rollback){
                var res;
                if(rollback){
                    res = [
                        fwk.sync.Primitive.template_delete(this._templateId),
                        fwk.sync.Primitive.element_delete(this.element)];

                    each(this.selection, function (e) {
                        res.push(fwk.sync.Primitive.element_new(e));
                    });
                } else {
                    res = [
                        fwk.sync.Primitive.template_change(this.element.getTemplate()),
                        fwk.sync.Primitive.element_new(this.element)];

                    each(this.selection, function (e) {
                        res.push(fwk.sync.Primitive.element_delete(e));
                    });
                }

                return res;
            }
        }
    })());
});