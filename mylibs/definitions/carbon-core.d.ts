declare module "carbon-core" {
    export * from "carbon-runtime";
    export * from "carbon-basics";
    export * from "carbon-geometry";
    export * from "carbon-api";
    export * from "carbon-model";
    export * from "carbon-app";
    // export * from "carbon-basics";
    export * from "carbon-rendering";
    export * from "carbon-contrib";
    export * from "carbon-bezier";
    export * from "carbon-code";

    //TODO: encapsulate or describe
    export var RequestAnimationSettings: any;
    export var ActionType: any;
    export var StyleManager: any;
    export var PropertyMetadata: any;
    export var Artboard: any;
    export var PropertyTracker: any;
    export var params: any;
    export var MirroringController: any;
    export var Layer: any;
    export var MirroringView: any;
    export var ArtboardProxyPage: any;
    export var Types: any;
    export var NullPage: any;
    export var CompositeElement: any;
    export var Devices: any;
    export var DesignerView: any;
    export var DesignerController: any;
    export var SelectComposite: any;
    export var SelectFrame: any;
    export var Clipboard: any;
    export var CustomGuides: any;
    export var LayoutGridLines:any;
    export var LayoutGridColumns:any;
    export var CommandManager:any;
    export var Invalidate: any;
    export var UserSettings:any;
    export var ContextPool:any;
    export var CoreIntl:any;
    export var domUtil:any;
    export var PreviewController:any;
    export var PreviewView:any;
    export var PreviewModel:any;
    export var CompilerService:any;
    export var ContextLayerSource: any;
    export var CodeNameProvider: any;
    export class Shape{}
    export function createUUID(): string;
}