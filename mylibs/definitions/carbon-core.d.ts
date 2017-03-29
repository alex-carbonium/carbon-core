declare module "carbon-core" {
    export * from "carbon-basics";
    export * from "carbon-geometry";
    export * from "carbon-api";
    export * from "carbon-model";
    export * from "carbon-app";
    export * from "carbon-basics";
    export * from "carbon-proxies";
    export * from "carbon-rendering";

    //TODO: encapsulate or describe
    export var RequestAnimationSettings: any;
    export var ActionType: any;
    export var AnimationType: any;
    export var EasingType: any;
    export var StyleManager: any;
    export var PropertyMetadata: any;
    export var ArtboardTemplateControl: any;
    export var Artboard: any;
    export var StateBoard: any;
    export var TileSize: any;
    export var PropertyTracker: any;
    export var Selection: any;
    export var Environment: any;
    export class Shape{}
    export function createUUID(): string;
}