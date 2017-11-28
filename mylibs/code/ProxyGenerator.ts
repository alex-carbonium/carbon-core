import { IContainer, IUIElement } from "carbon-core";
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

    static generate(artboard: IContainer): string {
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
        return `
        /// <reference path="carbon-runtime.d.ts" />
declare const artboard:any;
${
controlList.map(v => `declare const ${v.name}:${v.type};`).join('\n')
}
            `;
    }
}