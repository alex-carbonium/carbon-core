import { IElementWithCode } from "carbon-model";
import Services from "Services";
import { IDisposable } from "carbon-basics";
import { ArtboardProxyGenerator } from "./ProxyGenerator";

var platformLib = require("raw-loader!../definitions/runtime-platform.d.ts");
var carbonRuntimeSource: string = require("raw!../definitions/carbon-runtime.d.ts") as any;
var runtimeTSDefinitionCode = carbonRuntimeSource
    .substr(0, carbonRuntimeSource.lastIndexOf('}') - 1)
    .replace(/^.+export /gm, "")
    .replace('declare module "carbon-runtime" {', '')
    .replace(/^.+\/\*declare \*\//gm, "declare ");

interface ICodeCacheItem {
    text: string;
    version: number;
}

export class CompiledCodeProvider implements IDisposable {
    private _codeCache: WeakMap<IElementWithCode, ICodeCacheItem> = new WeakMap<IElementWithCode, ICodeCacheItem>();
    private static _globalLibs = {
        "runtime-platform.d.ts": {
            text: () => platformLib,
            version: 1
        },
        "carbon-runtime.d.ts": {
            text: () => runtimeTSDefinitionCode,
            version: 1
        }
    }
    getStaticLibs() {
        return CompiledCodeProvider._globalLibs;
    }

    getDynamicLibs(artboard, module) {
        return {
            'carbon-runtime-names.d.ts': {
                text: () => ArtboardProxyGenerator.generateRuntimeNames(App.Current.activePage),
                version: App.Current.activePage.version
            },
            ['n' + artboard.id + ".d.ts"]: {
                text: () => artboard.declaration(module),
                version: artboard.version
            }
        }
    }

    getCode(element: IElementWithCode): Promise<string | void> {
        if (this._codeCache.has(element)) {
            let item = this._codeCache.get(element);
            if (item.version === element.version) {
                return Promise.resolve(item.text);
            }
        }

        let fileName = element.id + ".ts";
        let code = `namespace n${element.id} {
            ${element.code()}
        }`
        Services.compiler.addLib("carbon-runtime-names.d.ts", ArtboardProxyGenerator.generateRuntimeNames(App.Current.activePage));
        Services.compiler.addLib(element.id + ".d.ts", element.declaration(true))

        return Services.compiler.compile(fileName, code).then((result) => {
            this._codeCache.set(element, { version: element.version, text: result.text });
            let target = (element as any).runtimeProps.sourceArtboard || element;
            target.exports = result.exports;
            return result.text;
        }).catch(data => {
            // TODO: report error to UI
            console.error(data);
        });
    }

    setCode(element: IElementWithCode, text: string) {
        this._codeCache.set(element, { version: element.version, text: text });
    }

    dispose() {
        this._codeCache = null;
    }
}