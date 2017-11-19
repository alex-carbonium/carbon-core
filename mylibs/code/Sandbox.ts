import {ControlNameResolver} from "./ControlNameResolver";
import { IArtboard } from "carbon-core";
import { ControlProxy } from "./ControlProxy";

export class Sandbox {
    runOnArtboard(artboard:IArtboard, code:string) {
        let nameResolver = new ControlNameResolver(artboard);
        let resolverProxy = new Proxy({}, nameResolver);
        ControlProxy.clear();
        // with is not supported in TS, so should wrap in eval
        window["__sandboxEval"](code, resolverProxy);
    }
}