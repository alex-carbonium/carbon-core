import Command from "../framework/commands/Command";
import Primitive from "../framework/sync/Primitive";

export default klass(Command, {
    _constructor: function(app, props, oldProps){
        if (oldProps === undefined){
            oldProps = app.selectProps(props);
        }
        this.primitives = [Primitive.app_props_changed(app, props, oldProps)];
    },
    toPrimitiveList:function(){
        return this.primitives;
    }
});
