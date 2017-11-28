declare module "carbon-code" {
    import { IContainer } from "carbon-model";

     export class Sandbox {
        runOnElement(artboard:IContainer, code:string):void;
    }
}