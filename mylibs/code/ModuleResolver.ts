import { IContainer, IUIElement, IArtboard, IModuleResolver } from "carbon-core";
import { NameProvider } from "./NameProvider";
import { RuntimeContext } from "./runtime/RuntimeContext";
import { RuntimeScreen } from "./runtime/RuntimeScreen";
import { AutoDisposable } from "../AutoDisposable";

const skipList = ["eval", "proxy"]
const blackList = ["window", "document", "uneval"];

const system = {
    'NaN':NaN,
    'Infinity':Infinity,
    'parseInt':parseInt,
    'parseFloat':parseFloat,
    'isNaN':isNaN,
    'isFinite':isFinite,
    'Math':Object.freeze(Math),
    'RegExp':Object.freeze(RegExp)
}

export class ModuleResolver {
    private _skipMap = skipList.reduce((m, v) => { m[v] = true; return m; }, {})
    private _blackMap = blackList.reduce((m, v) => { m[v] = true; return m; }, {})
    private _context: RuntimeContext;
    private _localContext = {};
    constructor(context: RuntimeContext, private moduleResolver:IModuleResolver, exports: any) {
        this._context = context;

        this._localContext["exports"] = exports;
    }

    set(target:any, name:string, value:any) {
        // store all exported stuff
        return false;
    }

    get(target: any, name: string): any {
        if(system.hasOwnProperty(name)) {
            return system[name];
        }

        if(name === "require") {
            return this.moduleResolver.requireModuleInstance(name);
        }

        if(this._localContext.hasOwnProperty(name)) {
            return this._localContext[name];
        }

        return this._context.get(name) || undefined;
    }

    has(target: any, name: string) {
        if (this._skipMap[name]) {
            return false;
        }
        return  system[name] || this._localContext[name] || this._blackMap[name] || this._context.get(name);
    }
}