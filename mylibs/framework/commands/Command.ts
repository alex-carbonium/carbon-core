import RelayoutQueue from "../relayout/RelayoutQueue";
import Environment from "../../environment";
import { IPrimitive, PrimitiveType, ViewState } from "carbon-core";

export default class Command {
    constructor(public primitives: IPrimitive[], public rollbacks: IPrimitive[]) {
    }

    flushRedoStack() {
        if(this.primitives.length !== 1) {
            return true;
        }

        return this.primitives[0].type !== PrimitiveType.Selection;
    }

    execute(){
        RelayoutQueue.enqueueAll(this.primitives);
    }

    rollback(){
        RelayoutQueue.enqueueAll(this.rollbacks);
    }
}
