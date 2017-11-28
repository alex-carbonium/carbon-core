import { IDisposable } from "carbon-basics";

export class ArtboardRuntimeModel implements IDisposable {
    _toDispose:IDisposable[] = [];

    dispose() {
        if(this._toDispose && this._toDispose.length) {
            this._toDispose.forEach(e=>e.dispose());
        }
    }
}