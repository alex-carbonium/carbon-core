import Command from "../framework/commands/Command";
import Primitive from "../framework/sync/Primitive";

export default klass(Command, {
    _constructor: function(page, props, oldProps){
        if (oldProps === undefined){
            oldProps = page.selectProps(props);
        }
        this.primitives = [Primitive.page_props_changed(page, props, oldProps)];
    },
    toPrimitiveList:function(){
        return this.primitives;
    }
});
