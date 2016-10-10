import Command from "../framework/commands/Command";

export default klass(Command, {
    _constructor: function (primitives, rollbacks) {
        this.primitives = primitives;
        this.rollbacks = rollbacks;
    },
    toPrimitiveList: function () {
        return this.primitives;
    }
});
