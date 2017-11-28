import { IContainer, IUIElement } from "carbon-core";
import { NameProvider } from "./NameProvider";
import { ElementProxy } from "./ElementProxy";

const skipList = ["eval"]
const blackList = ["window", "document", "uneval"]

export class ControlNameResolver {
    private _artboard: IContainer;
    private _proxiesMap: { [name: string]: IUIElement } = {};
    private _skipMap = skipList.reduce((m, v)=>{m[v] = true;return m;}, {})
    private _blackMap = blackList.reduce((m, v)=>{m[v] = true;return m;}, {})
    constructor(artboard: IContainer) {
        this._artboard = artboard;
    }

    _findControl(name: string) {
        let result = null;
        result = this._proxiesMap[name];
        if (result === undefined) {
            result = null;
            this._artboard.applyVisitor(e => {
                // it is not supper fast to escapeNames many times,
                // but expectation is that only small amount of controls
                // will be used in code, so don't want to build map of all controls
                // but should be change later if needed
                if (name === NameProvider.escapeName(e.name)) {
                    result = e;
                    return false;
                }
            });
            if(result) {
                result = new Proxy(result, new ElementProxy(result));
            }
            this._proxiesMap[name] = result;
        }

        return result;
    }

    get(target: any, name: string): any {
        return this._findControl(name) || undefined;
    }

    has(target:any, name:string) {
        if(this._skipMap[name]) {
            return false;
        }
        return !!this._findControl(name) || this._blackMap[name];
    }
}