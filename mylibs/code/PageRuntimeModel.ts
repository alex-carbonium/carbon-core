import { IDisposable } from "carbon-basics";
import { IPage } from "carbon-app";
import { IContainer, IUIElement } from "carbon-model";
import { IElementWithCode } from "carbon-core";

export class PageRuntimeModel implements IDisposable {
    private _toDispose:IDisposable[] = [];
    private _artboardModels = [];

    initialize(element:IContainer | IElementWithCode) {
        if((element as IContainer).children) {
            (element as IContainer).children.forEach(p=>this.initialize(p as any))
        }

        if((element as IElementWithCode).code) {
            let code = element as IElementWithCode;

        }
    }

    dispose() {
        if(this._toDispose && this._toDispose.length) {
            this._toDispose.forEach(e=>e.dispose());
        }
    }
}