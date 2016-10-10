import Command from "../framework/commands/Command";

export default klass(Command, {
    _constructor: function(element, props, oldProps, prepared){
        if (!prepared){
            element.prepareProps(props);
        }
        element.setProps(props);
    },
    transparent:function(){
        return true;
    },
    toPrimitiveList:function(){
        return [];
    }
});
