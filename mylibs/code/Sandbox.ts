import {ControlNameResolver} from "./ControlNameResolver";
import { IContainer } from "carbon-core";
import { ElementProxy } from "./runtime/RuntimeProxy";
import { RuntimeContext } from "./runtime/RuntimeContext";
import { ModuleResolver } from "./ModuleResolver";


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
    runOnElement(context:RuntimeContext, element:IContainer, code:string) {
        let nameResolver = new ControlNameResolver(context, element);

        ElementProxy.clear();

        code = code.replace('Object.defineProperty(exports, "__esModule", { value: true });', '');
        code = "let eval = null;" + code;

        sandboxFunc = sandboxFunc || new Function('__proxy', '__code', source);
        sandboxFunc(nameResolver.proxy, code);
    }

    runOnModule(context:RuntimeContext, module:any, code:string) {
        let resolver = new ModuleResolver(context, module);
        let resolverProxy = new Proxy({}, resolver);

        code = code.replace('Object.defineProperty(exports, "__esModule", { value: true });', '');
        code = "let eval = null;" + code;

        sandboxFunc = sandboxFunc || new Function('__proxy', '__code', source);
        sandboxFunc(resolverProxy, code);
    }
}