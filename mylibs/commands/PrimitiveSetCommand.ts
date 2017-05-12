import Command from "../framework/commands/Command";
import { PrimitiveType } from "carbon-core";

export default class PrimitiveSetCommand extends Command{
    constructor(private primitives, private rollbacks) {
        super();
    }
    flushRedoStack() {
        if(this.primitives.length !== 1) {
            return true;
        }

        return this.primitives[0].type !== PrimitiveType.Selection;
    }
    toPrimitiveList() {
        return this.primitives;
    }
}
