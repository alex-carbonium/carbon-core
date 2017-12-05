import { IDisposable } from "carbon-runtime";
import { AutoDisposable } from "../../AutoDisposable";
import { NavigationController } from "./NavigationController";
import { IPreviewModel, IProxySource } from "carbon-core";
import { RuntimeProxy } from "./RuntimeProxy";

export class RuntimeContext {
    _objects:any = {};

    register(name:string, source:IProxySource) {
        this._objects[name] = RuntimeProxy.create(source);
    }

    get(name:string) {
        return this._objects[name];
    }
}