import Command from "../framework/commands/Command";
import Primitive from "../framework/sync/Primitive";
import CompoundPath from "../ui/common/CompoundPath";
import {unionRect} from "../math/geometry";
import Path from "ui/common/Path";


export default klass(Command, {
    _constructor: function(joinMode, elements){
        this._elements = elements;
        for(var i = 0; i < elements.length; ++i) {
            var e = elements[i];
            if(!(e instanceof Path) && !(e instanceof CompoundPath)){
                var path = e.convertToPath();
                var parent = e.parent();
                parent.replace(e, path);

                elements[i]=path;
            }
        }
        this._joinMode = joinMode;
    },

    execute:function(){
        var elements = this._elements;
        var path, rect;
        var e0 = elements[0];
        var positions = [];
        var parent = e0.parent();
        if(e0 instanceof CompoundPath){
            path = e0;
            for(var i = 1; i < elements.length; ++i) {
                var e = elements[i];
                e.joinMode(this._joinMode);
                var pos = e.parent().local2global(e.position());
                pos = path.global2local(pos);
                path.add(e);
                e.setProps({x:pos.x, y:pos.y});
            }

        } else {
            path = new CompoundPath();

            path.backgroundBrush(e0.backgroundBrush());
            path.borderBrush(e0.borderBrush());
            path.name(e0.displayName());
            path.styleId(e0.styleId());

            rect = e0.getBoundaryRectGlobal();
            var index;
            for(var i = 0; i < elements.length; ++i) {
                var e = elements[i];
                e.joinMode(this._joinMode);
                var pos = parent.local2global(e.position());
                positions.push(pos);
                rect = unionRect(rect, e.getBoundaryRectGlobal());
                if(i === 0){
                    index = e.parent().positionOf(e);
                }
                e.parent().remove(e)
                path.add(e);
            }

            path.resize(rect);
            var pos = path.position();
            pos = parent.global2local(pos);
            path.setProps({x:pos.x, y:pos.y});

            parent.insert(path, index);

            for(var i = 0; i < elements.length; ++i) {
                var e = elements[i];
                var pos = path.global2local(positions[i]);
                e.setProps({x:pos.x, y:pos.y});
            }
        }

        path.recalculate();

    },
    toPrimitiveList:function(){
        return this.primitives;
    }
});
