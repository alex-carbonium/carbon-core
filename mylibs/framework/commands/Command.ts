import RelayoutQueue from "../relayout/RelayoutQueue";
import Environment from "../../environment";
import { IPrimitive, PrimitiveType, ViewState } from "carbon-core";
import { createUUID } from "../../util";

export default class Command {
    constructor(public primitives: IPrimitive[], public rollbacks: IPrimitive[]) {
    }

    flushRedoStack() {
        if(this.primitives.length !== 1) {
            return true;
        }

        return this.primitives[0].type !== PrimitiveType.Selection;
    }

    execute(redo?: boolean){
        var primitives = this.primitives;
        if (redo) {
            primitives = this.primitives.map(x => Object.assign({}, x));
            primitives.forEach(x => x.id = createUUID());
        }
        RelayoutQueue.enqueueAll(primitives);
    }

    rollback(){
        RelayoutQueue.enqueueAll(this.rollbacks);
    }
}
