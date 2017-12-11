import { IDisposable, CompilationResult} from "carbon-core";
import { CompiledCodeProvider } from "../CompiledCodeProvider";

var CompilerWorkerCode: any = require("raw-loader!./CompilerWorker.w");
var defaultLib = require("raw-loader!../../../node_modules/typescript/lib/lib.d.ts");
var typescriptCompiler = require("raw-loader!../../../node_modules/typescript/lib/typescript.js");

class CompilerService implements IDisposable {
    _worker: Worker;
    public codeProvider;
    _tasks = new Map<string, { resolve: (e: any) => void, reject: (e: any) => void }>();

    _onCompilerMessage = (e: MessageEvent) => {
        let fileName = e.data.fileName;
        if (fileName) {
            let callbacks = this._tasks.get(fileName);
            if (callbacks) {
                this._tasks.delete(fileName);
                if (e.data.error) {
                    callbacks.reject(e.data);
                } else {
                    callbacks.resolve({text:e.data.text, exports:e.data.exports});
                }
            }
        }
    }

    constructor() {
        this.codeProvider = new CompiledCodeProvider(this);
        var blob = new Blob([CompilerWorkerCode], {type:'application/javascript'})
        this._worker = new Worker(URL.createObjectURL(blob));
        this._worker.postMessage({ts:typescriptCompiler})

        this._worker.onmessage = this._onCompilerMessage;
        this._addFile("lib.d.ts", defaultLib);
        let staticLibs = this.codeProvider.getStaticLibs();
        let libNames = Object.keys(staticLibs);
        for(let libName of libNames) {
            this._addFile(libName, staticLibs[libName].text());
        }

        // this._addFile("platform.d.ts", platformLib);
    }

    private _addFile(fileName, text) {
        this._worker.postMessage({ fileName, text });
    }

    addLib(fileName, text) {
        this._addFile(fileName, text);
    }

    compile(fileName: string, text: string): Promise<CompilationResult> {
        let promise = new Promise<CompilationResult>((resolve, reject) => {
            this._tasks.set(fileName, { resolve, reject });
            this._addFile(fileName, text);
        });

        return promise;
    }

    clear() {
        //todo
    }

    dispose() {
        if (this._worker) {
            this._worker.terminate();
            this._worker = null;
        }
    }
}

export default new CompilerService();

