import RelayoutQueue from "../relayout/RelayoutQueue";
import { IPrimitive, PrimitiveType, ViewState, ICommand, IRect, LayerType, Primitive } from "carbon-core";
import { createUUID } from "../../util";
import Rect from "../../math/rect";
import IsolationContext from "../../IsolationContext";

export default class PrimitiveCommand implements ICommand {
    constructor(
        public primitives: Primitive[],
        public rollbacks: Primitive[],
        public pageId,
        public commandRect: IRect,
        public isolation: boolean
    ) {
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
            App.Current.actionManager.invoke("ensureVisibleRect", this.commandRect);
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

        if (IsolationContext.isActive && !this.isolation) {
            App.Current.actionManager.invoke("exitisolation");
        }

        if (this.commandRect !== Rect.Zero) {
            App.Current.actionManager.invoke("ensureVisibleRect", this.commandRect);
        }

        RelayoutQueue.enqueueAll(this.rollbacks);
    }
}
