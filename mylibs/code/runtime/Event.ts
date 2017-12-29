import { DataBag, IDisposable } from "carbon-core";
import { ModelFactory } from "./ModelFactory";

class EventDisposable implements IDisposable {
    dispose(): void {
        let index = this.array.findIndex(c=>c === this.callback);
        this.array.splice(index, 1);
    }
    constructor(private callback:any, private array:any[]) {
    }
}

export class Event implements IDisposable {
    private _handlers:((data?:DataBag) => void | boolean | Promise<void | boolean>)[] = [];

    registerHandler(callback: (data?:DataBag) => void | boolean | Promise<void | boolean>): IDisposable {
        this._handlers.push(callback);

        return new EventDisposable(callback, this._handlers);
    }

    async raise(data?: DataBag): Promise<boolean | void> {
        for(var i = 0; i < this._handlers.length; ++i) {
            let res = this._handlers[i](data);
            if(res instanceof Promise) {
                await res;
            }
        }
    }

    dispose(): void {
        this._handlers.length = 0;
    }
}