import {ControlNameResolver} from "./ControlNameResolver";
import { IContainer } from "carbon-core";
import { ElementProxy } from "./ElementProxy";
import { RuntimeContext } from "./runtime/RuntimeContext";

export class Sandbox {
    runOnElement(context:RuntimeContext, artboard:IContainer, code:string) {
        let nameResolver = new ControlNameResolver(context, artboard);
        let resolverProxy = new Proxy({}, nameResolver);

        // with is not supported in TS, so should wrap in eval
        window["__sandboxEval"]("n" + artboard.id, code, resolverProxy);
    }
}