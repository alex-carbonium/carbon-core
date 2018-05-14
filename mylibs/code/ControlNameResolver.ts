import { IContainer, IUIElement, IArtboard } from "carbon-core";
import { NameProvider } from "./NameProvider";
import { ElementProxy } from "./runtime/RuntimeProxy";
import { RuntimeContext } from "./runtime/RuntimeContext";
import { RuntimeProxy } from "./runtime/RuntimeProxy";
import { RuntimeScreen } from "./runtime/RuntimeScreen";
import { AutoDisposable } from "../AutoDisposable";
import { Page, IPreviewModel, IModuleResolver } from "carbon-app";
import { PropertyAnimation } from "../framework/animation/PropertyAnimation";
import { Color } from "../framework/Color";

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
    'RegExp':Object.freeze(RegExp),
    'require':true,
    'exports':true,
    'PropertyAnimation':Object.freeze(PropertyAnimation),
    'Color': Object.freeze(Color),
    'Promise': Object.freeze(Promise),
}

export class ControlNameResolver {
    private _skipMap = skipList.reduce((m, v) => { m[v] = true; return m; }, {})
    private _blackMap = blackList.reduce((m, v) => { m[v] = true; return m; }, {})
    private _localContext = {};
    private _nameInstanceMap = {}
    public readonly proxy:any;

    constructor(private context: RuntimeContext, private moduleResolver:IModuleResolver, private artboard: IContainer) {
        let screen = new RuntimeScreen(artboard  as IArtboard);
        this._localContext["DeviceScreen"] = screen;
        this._localContext["artboard"] = this.artboard;
        artboard.runtimeProps.disposables = artboard.runtimeProps.disposables || new AutoDisposable();
        this.artboard.runtimeProps.disposables.add(screen)

        this.proxy = new Proxy({}, this);
    }

    require = (name) => {
        if(name === "./n"+(this.artboard as any).compilationUnitId +".types") {
            return this.proxy;
        }

        let previewModel = this.moduleResolver;
        if(previewModel) {
            return previewModel.requireModuleInstance(name);
        }

        return null;
    }

    set(target:any, name:string, value:any) {
        // store all exported stuff
        let runtimeData = this.artboard.runtimeProps.runtimeData = this.artboard.runtimeProps.runtimeData || {};
        runtimeData[name] = value;

        return true;
    }

    _findControl(name: string) {
        let source = this._nameInstanceMap[name];
        let proxy;
        if(source) {
            proxy = RuntimeProxy.wrap(source);
        }

        if (proxy === undefined) {
            let source = null;
            proxy = null;

            if(this._localContext.hasOwnProperty(name)) {
                source = this._localContext[name];
            }
            else {
                this.artboard.applyVisitor(e => {
                    // it is not supper fast to escapeNames many times,
                    // but expectation is that only small amount of controls
                    // will be used in code, so don't want to build map of all controls
                    // but should be change later if needed
                    if (name === NameProvider.escapeName(e.name)) {
                        source = e;
                        this._nameInstanceMap[name] = e;
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
        if(name === "require") {
            return this.require;
        }
        if(name === "exports") {
            this.artboard.runtimeProps.runtimeData = this.artboard.runtimeProps.runtimeData || {};
            return this.artboard.runtimeProps.runtimeData;
        }
        if(system.hasOwnProperty(name)) {
            return system[name];
        }
        return this._runtimeData(name) || this._findControl(name) || this.context.get(name) || undefined;
    }

    _runtimeData(name)  {
        if(this.artboard.runtimeProps && this.artboard.runtimeProps.runtimeData) {
            return this.artboard.runtimeProps.runtimeData[name];
        }
    }

    has(target: any, name: string) {
        if (this._skipMap[name]) {
            return false;
        }
        return  system[name] || this._runtimeData(name) || !!this._findControl(name) || this._blackMap[name] || this.context.get(name);
    }
}