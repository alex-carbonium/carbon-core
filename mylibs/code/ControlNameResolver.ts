import { IContainer, IUIElement, IArtboard } from "carbon-core";
import { NameProvider } from "./NameProvider";
import { ElementProxy } from "./runtime/RuntimeProxy";
import { RuntimeContext } from "./runtime/RuntimeContext";
import { RuntimeProxy } from "./runtime/RuntimeProxy";
import { RuntimeScreen } from "./runtime/RuntimeScreen";
import { AutoDisposable } from "../AutoDisposable";
import Environment from "environment";

const skipList = ["eval", "proxy"]
const blackList = ["window", "document", "uneval"];

function localRequire(name) {
    let previewModel = (Environment.controller as any).previewModel;
    if(previewModel) {
        return previewModel.requireModuleInstance(name);
    }

    return null;
}

const system = {
    'NaN':NaN,
    'Infinity':Infinity,
    'parseInt':parseInt,
    'parseFloat':parseFloat,
    'isNaN':isNaN,
    'isFinite':isFinite,
    'Math':Object.freeze(Math),
    'RegExp':Object.freeze(RegExp),
    'require':localRequire
}

export class ControlNameResolver {
    private _artboard: IContainer;
    private _skipMap = skipList.reduce((m, v) => { m[v] = true; return m; }, {})
    private _blackMap = blackList.reduce((m, v) => { m[v] = true; return m; }, {})
    private _context: RuntimeContext;
    private _localContext = {};
    constructor(context: RuntimeContext, artboard: IContainer) {
        this._artboard = artboard;
        this._context = context;
        let screen = new RuntimeScreen(artboard as IArtboard);
        this._localContext["DeviceScreen"] = screen;
        this._localContext["artboard"] = this._artboard;
        artboard.runtimeProps.disposables = artboard.runtimeProps.disposables || new AutoDisposable();
        this._artboard.runtimeProps.disposables.add(screen)
    }

    set(target:any, name:string, value:any) {
        // store all exported stuff
        let runtimeData = this._artboard.runtimeProps.runtimeData = this._artboard.runtimeProps.runtimeData || {};
        runtimeData[name] = value;

        return true;
    }

    _findControl(name: string) {
        let proxy = ElementProxy.tryGet(name);
        if (proxy === undefined) {
            let source = null;
            proxy = null;

            if(this._localContext.hasOwnProperty(name)) {
                source = this._localContext[name];
            }
            else {
                this._artboard.applyVisitor(e => {
                    // it is not supper fast to escapeNames many times,
                    // but expectation is that only small amount of controls
                    // will be used in code, so don't want to build map of all controls
                    // but should be change later if needed
                    if (name === NameProvider.escapeName(e.name)) {
                        source = e;
                        return false;
                    }
                });
            }
            if (source) {
                proxy = ElementProxy.createForElement(name, source);
            }
        }

        return proxy;
    }

    get(target: any, name: string): any {
        if(system.hasOwnProperty(name)) {
            return system[name];
        }
        return this._runtimeData(name) || this._findControl(name) || this._context.get(name) || undefined;
    }

    _runtimeData(name)  {
        if(this._artboard.runtimeProps && this._artboard.runtimeProps.runtimeData) {
            return this._artboard.runtimeProps.runtimeData[name];
        }
    }

    has(target: any, name: string) {
        if (this._skipMap[name]) {
            return false;
        }
        return  system[name] || this._runtimeData(name) || !!this._findControl(name) || this._blackMap[name] || this._context.get(name);
    }
}