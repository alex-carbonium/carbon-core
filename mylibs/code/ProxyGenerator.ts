import { IContainer, IUIElement, IPage } from "carbon-core";
import { NameProvider } from "./NameProvider";
import { Types } from "../framework/Defs";
import { IElementWithCode, IArtboard } from "carbon-model";
let genericMatcher = RegExp(/\w+<(.+)>/);
export class ArtboardProxyGenerator {
    static getControlType(e) {
        switch (e.t) {
            case Types.Path:
                return "TPath";
            case Types.Rectangle:
                return "TRectangle ";
            case Types.Text:
                return "TText";
            case Types.ArtboardFrame:
                return "TArtboardFrame";
        }
        return "TUIElement";
    }

    static getGenericParameter(type:string):string {
        return genericMatcher.exec(type)[1];
    }

    static generateSymbolsInfo(modifier, symbolsList: { symbol: any, exports: any }[]) {
        let res = '';
        for (var item of symbolsList) {
            let name = NameProvider.escapeName(item.symbol.name);
            let type;
            if (item.exports) {
                let names = Object.keys(item.exports);
                let decl = [];
                for (let name of names) {
                    let type = item.exports[name];
                    if (type.startsWith('Property<')) {
                        let baseType = ArtboardProxyGenerator.getGenericParameter(type);
                        decl.push(`${name}: ${baseType};`)
                    } else if (type.startsWith('Event<')) {
                        let baseType = ArtboardProxyGenerator.getGenericParameter(type);
                        decl.push(`${name}: EventCallback<${baseType}>;`)
                    }
                }

                res += `
            ${modifier} interface T${name} extends TSymbol {
                ${decl.join('\n')}
            }
            `
                type = 'T' + name;
            } else {
                type = 'TSymbol';
            }
            res += `${modifier} const ${name}:${type} & MouseEventHandler;
            `
        }

        return res;
    }

    static generateImport(artboard) {
        let controlList = ["artboard", "navigationController"];

        artboard.applyVisitorBreadthFirst((e: IUIElement) => {
            if (e === artboard) {
                return;
            }
            let name = NameProvider.escapeName(e.name);
            controlList.push(name);
        });
        return `import {${controlList.join(', ')}} from "./n${artboard.id}.types"`
    }

    static generate(artboard: IContainer, module: boolean): string {
        let controlList = [];
        let symbolsList = [];

        artboard.applyVisitorBreadthFirst((e: IUIElement) => {
            if (e === artboard) {
                return;
            }
            if ((e as any).t === Types.Symbol) {
                let artboard: IArtboard = (e as any).artboard;
                symbolsList.push({ symbol: e, exports: artboard.exports });
                return true; // do not parse internals of a symbol
            }

            let name = NameProvider.escapeName(e.name);
            let type = ArtboardProxyGenerator.getControlType(e);
            controlList.push({ name, type });
        });
        let modifier = module ? 'export' : 'declare';

        let symbolTypes = ArtboardProxyGenerator.generateSymbolsInfo(modifier, symbolsList);

        let content = `
${modifier} const artboard:TArtboard;
${modifier} const navigationController:INavigationController;
${symbolTypes}
${controlList.map(v => `${modifier} const ${v.name}:${v.type};`).join('\n')}
`;
        return content;

//         if (module) {
//             return `
// /// <reference path="carbon-runtime.d.ts" />
// declare namespace n${artboard.id} {
// ${content}
// }`;
//         } else {
//             return content;
//         }
    }

    public static generateRuntimeNames(page: IPage): string {
        let artboards = page.getAllArtboards().map(a => '"' + a.name + '"');

        return `
        declare type ArtboardNames = ${artboards.join(" | ")};
        `
    }
}