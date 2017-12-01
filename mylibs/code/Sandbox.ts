import {ControlNameResolver} from "./ControlNameResolver";
import { IContainer } from "carbon-core";
import { ElementProxy } from "./ElementProxy";
import { RuntimeContext } from "./runtime/RuntimeContext";


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

var sandboxFunc = new Function('__proxy', '__code', source);

export class Sandbox {
    runOnElement(context:RuntimeContext, artboard:IContainer, code:string) {
        let nameResolver = new ControlNameResolver(context, artboard);
        let resolverProxy = new Proxy({}, nameResolver);
        let name = "n" + artboard.id;

        code = 'var ' + name + ' = __proxy;' + "let eval = null;" + code;

        sandboxFunc(resolverProxy, code);
    }
}