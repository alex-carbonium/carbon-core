import { IDisposable } from "carbon-basics";

export class AutoDisposable implements IDisposable {
    private _items:IDisposable[] = [];
    add(disposable:IDisposable) {
        this._items.push(disposable);
    }

    dispose() {
        this._items.forEach(d=>d.dispose());
        this._items.length = 0;
    }
}