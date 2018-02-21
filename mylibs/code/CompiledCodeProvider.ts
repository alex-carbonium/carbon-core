import { IElementWithCode } from "carbon-model";
import { IDisposable } from "carbon-runtime";
import { ArtboardProxyGenerator } from "./ProxyGenerator";
import { ICompilerService } from "carbon-core";
import { NameProvider } from "./NameProvider";
import Artboard from "framework/Artboard";
import { resolve, reject } from "../../node_modules/@types/bluebird/index";

var platformLib = require("raw-loader!./runtimelibs/runtime-platform.d.ts.txt");
var carbonRuntimeSource: string = require("raw!../definitions/carbon-runtime.d.ts") as any;
var behaviors: string = require("raw!./runtimelibs/behaviors.ts.txt") as any;


var runtimeTSDefinitionCode = carbonRuntimeSource
    .substr(0, carbonRuntimeSource.lastIndexOf('}') - 1)
    .replace(/^.+export /gm, "")
    .replace('declare module "carbon-runtime" {', '')
    .replace(/^.+\/\*declare \*\//gm, "declare ");

interface ICodeCacheItem {
    result: Promise<string>;
    version: number;
}

let importMatcher = new RegExp(/import .+? from ['"].+?['"][;\n ]?/gm);

export class CompiledCodeProvider implements IDisposable {
    private _codeCache: Map<string, ICodeCacheItem> = new Map<string, ICodeCacheItem>();
    private static _globalLibs = {
        "runtime-platform.d.ts": {
            text: () => platformLib,
            version: 1
        },
        "carbon-runtime.d.ts": {
            text: () => runtimeTSDefinitionCode,
            version: 1
        },
        "./behaviors.ts" : {
            text: () => behaviors,
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
            ['n' + artboard.compilationUnitId + ".types.ts"]: {
                text: () => artboard.declaration(module),
                version: artboard.version
            }
        }

        return libs;
    }

    getGlobalModels(artboard) {
        let libs = {}

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

    getArtboardCode(element: IElementWithCode): Promise<string | void> {
        if (this._codeCache.has(element.compilationUnitId)) {
            let item = this._codeCache.get(element.compilationUnitId);
            if (item.version === element.codeVersion) {
                return item.result;
            }
        }
        let resolveCallback;
        let rejectCallback;
        let resultPromise = new Promise<string>((resolve, reject)=> {
            resolveCallback = resolve;
            rejectCallback = reject;
        });
        this._codeCache.set(element.compilationUnitId, { version: element.codeVersion, result: resultPromise });

        let fileName = element.compilationUnitId + ".ts";
        let code = ArtboardProxyGenerator.generateImport(element)
            + '\n'
            + element.code();

        this.compiler.addLib("carbon-runtime-names.d.ts", ArtboardProxyGenerator.generateRuntimeNames(App.Current.activePage));

        if (element instanceof Artboard) {
            let globals = this.getGlobalModels((element as any).runtimeProps.sourceArtboard || element);
            for (var key of Object.keys(globals)) {
                this.compiler.addLib(key, globals[key].text());
            }
        }

        this.compiler.addLib("n" + element.compilationUnitId + ".types.ts", element.declaration(true))
        this.compiler.compile(fileName, code).then((result) => {
            let target = (element as any).runtimeProps.sourceArtboard || element;
            target.exports = result.exports;
            resolveCallback(result.text);
            return result.text;
        }).catch(data => {
            // TODO: report error to UI
            rejectCallback(data);
            console.error(data);
        });

        return resultPromise;
    }

    setCode(element: IElementWithCode, text: string) {
        this._codeCache.set(element.compilationUnitId, { version: element.codeVersion, result: Promise.resolve(text) });
    }

    dispose() {
        this._codeCache = null;
    }
}