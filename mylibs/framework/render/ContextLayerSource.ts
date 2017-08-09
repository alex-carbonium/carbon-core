import ContextPool from "./ContextPool";
import { IContext } from "carbon-core";
import Selection from "framework/SelectionModel";
import Context from "./Context";
import Invalidate from "framework/Invalidate";
import NullContainer from "framework/NullContainer";

export default class ContextLayerSource extends Context {
    constructor(private contexts: IContext[]) {
        super();
        this._contexts = contexts;
        this._context = contexts[0];
        this._canvas = this._context.canvas;
        this._width = this._canvas.width;
        this._height = this._canvas.height;
        this.contextsStack = [];
        this.rootElement = null;

        for (var i = 0; i < contexts.length; ++i) {
            (contexts[i] as any)._mask = 1 << i;
        }

        this._selectionBinding = Selection.onElementSelected.bind(this, this.onSelectionChanged);
    }

    onSelectionChanged() {
        let count = 0;
        let max = Selection.elements.length;
        App.Current.activePage.applyVisitorTLR(e => {
            if (count && count === max) {
                e.runtimeProps.ctxl = 1 << 2;
            }
            else if (Selection.isElementSelected(e)) {
                var parent = e.parent();
                do {
                    if (parent.opacity() < 1 || parent.runtimeProps.mask) {
                        e = parent;
                        break;
                    }
                    parent = parent.parent();
                } while (parent && parent !== NullContainer);

                e.applyVisitorTLR(c => {
                    c.runtimeProps.ctxl = 1 << 1;
                });

                count++;
                return true;
            } else {
                e.runtimeProps.ctxl = 1 << 0;
            }
        })

        Invalidate.request();
    }

    dispose() {
        if (this._selectionBinding) {
            this._selectionBinding.dispose();
            this._selectionBinding = null;
        }
    }

    beginElement(element) {
        if (!this.rootElement) {
            this.rootElement = element;
        }
        var ctxl = element.runtimeProps.ctxl;
        if (ctxl !== undefined) {
            this.contextsStack.push(this._context);
            for (var i = 0; i < 3; ++i) {
                if (1 << i === ctxl) {
                    this._context = this._contexts[i];
                    break;
                }
            }
        }
        if ((this._context._mask & this.layerRedrawMask) === 0) {
            console.log(`element: ${element.name()} ignored`);
            return false;
        }

        console.log(`element: ${element.name()} on ${this._context._mask}`);

        return true;
    }

    endElement(element) {
        var ctxl = element.runtimeProps.ctxl;
        if (ctxl !== undefined) {
            this._context = this.contextsStack.pop();
        }
    }
}