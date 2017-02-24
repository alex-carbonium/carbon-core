import Command from "../framework/commands/Command";
import {PrimitiveType} from "../framework/Defs";

export default klass(Command, {
    _constructor: function (primitives, rollbacks) {
        this.primitives = primitives;
        this.rollbacks = rollbacks;
    },
    flushRedoStack() {
        if(this.primitives.length !== 1) {
            return true;
        }

        return this.primitives[0].type !== PrimitiveType.Selection;
    },
    toPrimitiveList: function () {
        return this.primitives;
    }
});
