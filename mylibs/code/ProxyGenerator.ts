import { IArtboard, IUIElement } from "carbon-core";
import { NameProvider } from "./NameProvider";
import { Types } from "../framework/Defs";

export class ArtboardProxyGenerator {
    getControlType(e) {
        switch (e.t) {
            case Types.Path:
                return "IPath";
            case Types.Rectangle:
                return "IRectangle";
        }
        return "IElement";
    }

    generate(artboard: IArtboard): Promise<string> {
        return new Promise<string>(resolve => {
            let controlList = [];

            artboard.applyVisitor(e => {
                if (e === artboard) {
                    return;
                }
                let name = NameProvider.escapeName(e.name());
                let type = this.getControlType(e);
                controlList.push({ name, type });
            });
            resolve(`
                declare const artboard:any;
                ${
                controlList.map(v => `declare const ${v.name}:${v.type};`).join('\n')
                }
            `)
        });
    }
}