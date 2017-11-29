import { IContainer, IUIElement, IPage } from "carbon-core";
import { NameProvider } from "./NameProvider";
import { Types } from "../framework/Defs";

export class ArtboardProxyGenerator {
    static getControlType(e) {
        switch (e.t) {
            case Types.Path:
                return "TPath & MouseEventHandler";
            case Types.Rectangle:
                return "TRectangle & MouseEventHandler";
        }
        return "TUIElement & MouseEventHandler";
    }

    static generate(artboard: IContainer, module:boolean): string {
        let controlList = [];

        artboard.applyVisitorBreadthFirst((e:IUIElement) => {
            if (e === artboard) {
                return;
            }
            if(e instanceof Symbol) {
                return true; // do not parse internals of a symbol
            }

            let name = NameProvider.escapeName(e.name);
            let type = ArtboardProxyGenerator.getControlType(e);
            controlList.push({ name, type });
        });
        if(module) {
            return `
            /// <reference path="carbon-runtime.d.ts" />
            declare namespace n${artboard.id} {
    export const artboard:TArtboard;
    export const navigationController:INavigationController;
    ${controlList.map(v => `export const ${v.name}:${v.type};`).join('\n')}
    }`;
        } else {
            return `
    declare const artboard:TArtboard;
    declare const navigationController:INavigationController;
    ${controlList.map(v => `declare const ${v.name}:${v.type};`).join('\n')}
    `;
        }
    }

    public static generateRuntimeNames(page:IPage):string {
        let artboards = page.getAllArtboards().map(a=>'"' +a.name+ '"');

        return `
        declare type ArtboardNames = ${artboards.join(" | ")};
        `
    }
}