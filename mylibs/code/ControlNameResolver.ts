import { IContainer, IUIElement, IArtboard } from "carbon-core";
import { NameProvider } from "./NameProvider";
import { ElementProxy } from "./runtime/RuntimeProxy";
import { RuntimeContext } from "./runtime/RuntimeContext";
import { RuntimeProxy } from "./runtime/RuntimeProxy";
import { RuntimeScreen } from "./runtime/RuntimeScreen";
import { AutoDisposable } from "../AutoDisposable";

const skipList = ["eval", "proxy"]
const blackList = ["window", "document", "uneval"]

export class ControlNameResolver {
    private _artboard: IContainer;
    private _skipMap = skipList.reduce((m, v) => { m[v] = true; return m; }, {})
    private _blackMap = blackList.reduce((m, v) => { m[v] = true; return m; }, {})
    private _context: RuntimeContext;
    private _screen: RuntimeScreen;
    constructor(context: RuntimeContext, artboard: IContainer) {
        this._artboard = artboard;
        this._context = context;
        this._screen = new RuntimeScreen(artboard as IArtboard);
        artboard.runtimeProps.disposables = artboard.runtimeProps.disposables || new AutoDisposable();
        this._artboard.runtimeProps.disposables.add(this._screen)
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
            if (name === "artboard") {
                source = this._artboard;
            }
            if(name === "DeviceScreen"){
                source = this._screen;
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
        return  this._runtimeData(name) || !!this._findControl(name) || this._blackMap[name] || this._context.get(name);
    }
}