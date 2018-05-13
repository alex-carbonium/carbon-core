import {ControlNameResolver} from "./ControlNameResolver";
import { IContainer, IPreviewModel, IModuleResolver } from "carbon-core";
import { RuntimeContext } from "./runtime/RuntimeContext";
import { ModuleResolver } from "./ModuleResolver";
import PreviewModel from "../framework/preview/PreviewModel";


let source = `
let handler = {
    get: function (target, name) {
        return target[name];
    },

    set:function(target, name, value) {
        target[name] = value;
        return true;
    },

    has: function (target, name) {
        if (name === "__proxy"
            || name === "__name"
            || name === "__code"
            || name === "eval"
            || name === "alert") {
            return false;
        }
        return true
    }
}

with (new Proxy({}, handler)) {
    with (__proxy) {
        eval(__code);
    }
}`;

var sandboxFunc = null;

export class Sandbox {
    runOnElement(context:RuntimeContext, moduleResolver:IModuleResolver, element:IContainer, code:string) {
        let nameResolver = new ControlNameResolver(context, moduleResolver, element);

        // ElementProxy.clear();

        code = code.replace('Object.defineProperty(exports, "__esModule", { value: true });', '');
        code = "let eval = null; (function(){" + code + "\r\n})()";

        sandboxFunc = sandboxFunc || new Function('__proxy', '__code', source);
        sandboxFunc(nameResolver.proxy, code);
    }

    runOnModule(context:RuntimeContext, moduleResolver:IModuleResolver, module:any, code:string) {
        let resolver = new ModuleResolver(context, moduleResolver, module);
        let resolverProxy = new Proxy({}, resolver);

        code = code.replace('Object.defineProperty(exports, "__esModule", { value: true });', '');
        code = "let eval = null;" + code;

        sandboxFunc = sandboxFunc || new Function('__proxy', '__code', source);
        sandboxFunc(resolverProxy, code);
    }
}