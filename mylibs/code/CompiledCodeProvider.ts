import { IElementWithCode } from "carbon-model";
import { IDisposable } from "carbon-runtime";
import { ArtboardProxyGenerator } from "./ProxyGenerator";
import { ICompilerService } from "carbon-core";
import { NameProvider } from "./NameProvider";
import Artboard from "framework/Artboard";

var platformLib = require("raw-loader!../definitions/runtime-platform.d.ts.txt");
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

let importMatcher = new RegExp(/import .+? from ['"].+?['"][;\n ]?/gm);

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
        let libs = {
            'carbon-runtime-names.d.ts': {
                text: () => ArtboardProxyGenerator.generateRuntimeNames(App.Current.activePage),
                version: App.Current.activePage.version
            },
            ['n' + artboard.id + ".d.ts"]: {
                text: () => artboard.declaration(module),
                version: artboard.version
            }
        }

        return libs;
    }

    getGlobalModels(artboard) {
        let libs = {

        }

        let pageCode = artboard.parent.code();
        if (pageCode) {
            libs["./" + NameProvider.escapeName(artboard.parent.name) + '.ts'] = {
                text: () => pageCode,
                version: artboard.parent.codeVersion
            }
        }


        return libs;
    }

    constructor(private compiler: ICompilerService) {

    }

    _extractAndRemoveImports(code: string, imports: string[]) {
        var res = importMatcher.exec(code);
        if (res) {
            res.forEach(r => {
                imports.push(r);
            })
        }

        return code.replace(importMatcher, '');
    }

    getModuleCode(name:string, code?:string): Promise<string | void> {
        return this.compiler.compile(name, code).then((result) => {
            return result.text;
        }).catch(data => {
            // TODO: report error to UI
            console.error(data);
        });
    }

    getArtobardCode(element: IElementWithCode): Promise<string | void> {
        if (this._codeCache.has(element)) {
            let item = this._codeCache.get(element);
            if (item.version === element.codeVersion) {
                return Promise.resolve(item.text);
            }
        }

        let fileName = element.id + ".ts";
        let imports = [];
        let baseCode = this._extractAndRemoveImports(element.code(), imports);

        let code = `
        ${imports.join('\n')}
        namespace n${element.id} {
            ${baseCode}
        }`
        this.compiler.addLib("carbon-runtime-names.d.ts", ArtboardProxyGenerator.generateRuntimeNames(App.Current.activePage));

        if (element instanceof Artboard) {
            let globals = this.getGlobalModels((element as any).runtimeProps.sourceArtboard || element);
            for (var key of Object.keys(globals)) {
                this.compiler.addLib(key, globals[key].text());
            }
        }

        this.compiler.addLib(element.id + ".d.ts", element.declaration(true))

        return this.compiler.compile(fileName, code).then((result) => {
            this._codeCache.set(element, { version: element.codeVersion, text: result.text });
            let target = (element as any).runtimeProps.sourceArtboard || element;
            target.exports = result.exports;
            return result.text;
        }).catch(data => {
            // TODO: report error to UI
            console.error(data);
        });
    }

    setCode(element: IElementWithCode, text: string) {
        this._codeCache.set(element, { version: element.codeVersion, text: text });
    }

    dispose() {
        this._codeCache = null;
    }
}