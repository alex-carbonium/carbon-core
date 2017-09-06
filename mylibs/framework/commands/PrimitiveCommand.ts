import RelayoutQueue from "../relayout/RelayoutQueue";
import Environment from "../../environment";
import { IPrimitive, PrimitiveType, ViewState, ICommand, IRect } from "carbon-core";
import { createUUID } from "../../util";
import Rect from "../../math/rect";

export default class PrimitiveCommand implements ICommand {
    constructor(public primitives: IPrimitive[], public rollbacks: IPrimitive[],
        public pageId, public commandRect: IRect) {
    }

    flushRedoStack() {
        if (this.primitives.length !== 1) {
            return true;
        }

        return this.primitives[0].type !== PrimitiveType.Selection
            && this.primitives[0].type !== PrimitiveType.View;
    }

    execute(redo?: boolean) {
        App.Current.setActivePageById(this.pageId);

        if (this.commandRect !== Rect.Zero) {
            Environment.view.ensureVisibleRect(this.commandRect);
        }

        var primitives = this.primitives;
        if (redo) {
            primitives = this.primitives.map(x => Object.assign({}, x));
            primitives.forEach(x => x.id = createUUID());
        }
        RelayoutQueue.enqueueAll(primitives);
    }

    rollback() {
        App.Current.setActivePageById(this.pageId);

        if (this.commandRect !== Rect.Zero) {
            Environment.view.ensureVisibleRect(this.commandRect);
        }

        RelayoutQueue.enqueueAll(this.rollbacks);
    }
}
