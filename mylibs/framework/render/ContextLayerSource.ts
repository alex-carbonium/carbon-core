import ContextPool from "./ContextPool";
import { IContext, IPooledObject, ContextType, RenderEnvironment, RenderFlags } from "carbon-core";
import Selection from "framework/SelectionModel";
import Context from "./Context";
import Invalidate from "framework/Invalidate";
import ObjectPool from "../ObjectPool";
import NullContainer from "framework/NullContainer";

class ClipReference implements IPooledObject {

    constructor(public id:string, public context:any) {

    }
    reset() {
        this.id = null;
        this.context = null;
    }

    free() {

    }
}

let objectPool = new ObjectPool(()=>{
    return new ClipReference(null, null);
}, 10);

export default class ContextLayerSource extends Context {
    contentContextCount: number;

    private _relativeClippingStack: any[];

    constructor(private contexts: IContext[]) {
        super(ContextType.Content);

        this.contentContextCount = contexts.filter(x => x.type === ContextType.Content).length;

        this._contexts = contexts;
        this._context = contexts[0];
        this._canvas = this._context.canvas;
        this._width = this._canvas.width;
        this._height = this._canvas.height;
        this.contextsStack = [];
        this.rootElement = null;
        this._relativeClippingStack = [];

        for (var i = 0; i < contexts.length; ++i) {
            (contexts[i] as any)._mask = 1 << i;
        }

        this._selectionBinding = Selection.onElementSelected.bind(this, this.onSelectionChanged);
    }


    onSelectionChanged() {
        App.Current.mapElementsToLayerMask();
    }

    dispose() {
        if (this._selectionBinding) {
            this._selectionBinding.dispose();
            this._selectionBinding = null;
        }
    }

    _clipCurrentContext(element) {
        this._context.save();
        let ref = objectPool.allocate();
        ref.id = element.id;
        ref.context = this._context;
        this._relativeClippingStack.push(ref);

        while(element && element !== NullContainer) {
            element.clip(this._context);
            element = element.parent();
        }
    }

    beginElement(element, environment: RenderEnvironment) {
        if (!this.rootElement) {
            this.rootElement = element;
        }
        var ctxl = element.runtimeProps.ctxl;
        if (ctxl !== undefined) {
            this.contextsStack.push(this._context);
            for (var i = 0; i < this.contentContextCount; ++i) {
                if (1 << i === ctxl) {
                    this._context = this._contexts[i];
                    break;
                }
            }
        }
        if ((this._context._mask & this.layerRedrawMask) === 0) {
            // console.log(`element: ${element.name} ignored, mask ${this.layerRedrawMask}`);
            return false;
        }

        // console.log(`element: ${element.name} on ${this._context._mask}`);

        if (environment.flags & RenderFlags.UseParentClipping) {
            let parent = element.parent();
            if (parent && parent.runtimeProps && parent.runtimeProps.ctxl !== ctxl) {
                // potentially we need to clip this element
                let relativeClip = this._relativeClippingStack[this._relativeClippingStack.length - 1];
                if (this._relativeClippingStack.length === 0 || relativeClip.id !== parent.id || relativeClip.context._mask !== ctxl) {
                    this._clipCurrentContext(parent);
                }
            }
        }

        return true;
    }

    logAllToConsole() {
        for(var i = 0; i < this._contexts.length; ++i) {
            let ctx = this._contexts[i];
            console.log(`${i}: mask: ${ctx._mask}`);
            ctx.logToConsole();
        }
    }

    endElement(element) {
        var ctxl = element.runtimeProps.ctxl;
        if (ctxl !== undefined) {
            this._context = this.contextsStack.pop();
        }

        if (this._relativeClippingStack.length) {
            var relativeClipContext = this._relativeClippingStack[this._relativeClippingStack.length - 1];
            while (relativeClipContext.id === element.id) {
                relativeClipContext.context.restore();
                let ref = this._relativeClippingStack.pop();
                objectPool.free(ref);
                if(this._relativeClippingStack.length === 0) {
                    break;
                }
                relativeClipContext = this._relativeClippingStack[this._relativeClippingStack.length - 1];
            }
        }
    }
}