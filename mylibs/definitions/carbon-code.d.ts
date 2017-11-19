declare module "carbon-code" {
    import { IArtboard } from "carbon-model";

    export class ArtboardProxyGenerator {
        generate(artboard: IArtboard): Promise<string>;
    }

    export class Sandbox {
        runOnArtboard(artboard:IArtboard, code:string):void;
    }
}