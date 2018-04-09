import { IDisposable, CompilationResult } from "carbon-core";
import { CompiledCodeProvider } from "../CompiledCodeProvider";
import CompilerWorker from "worker-loader?inline=true!./CompilerWorker.w";

var defaultLib = require("raw-loader!typescript/lib/lib.d.ts");

class CompilerService implements IDisposable {
    _worker: Worker;
    public codeProvider;
    _tasks = new Map<string, { resolve: (e: any) => void, reject: (e: any) => void }>();
    _staticCode = new Map<string, string>();
    _initializePromise: Promise<any>;

    _onCompilerMessage = (e: MessageEvent) => {
        let fileName = e.data.fileName;
        if (fileName) {
            let callbacks = this._tasks.get(fileName);
            if (callbacks) {
                this._tasks.delete(fileName);
                if (e.data.error) {
                    callbacks.reject(e.data);
                } else {
                    callbacks.resolve({ text: e.data.text, exports: e.data.exports });
                }
            }
        }
    }

    constructor() {
        this.codeProvider = new CompiledCodeProvider(this);
        this._worker = new CompilerWorker();

        this._worker.onmessage = this._onCompilerMessage;
        this._addFile("lib.d.ts", defaultLib);
        let staticLibs = this.codeProvider.getStaticLibs();
        let libNames = Object.keys(staticLibs);
        let promises = [];
        this._initializePromise = Promise.resolve();

        for (let libName of libNames) {
            if (libName.endsWith('.d.ts')) {
                this._addFile(libName, staticLibs[libName].text());
            } else {
                promises.push(this.compile(libName, staticLibs[libName].text())
                    .then(({text}) => {
                        this._staticCode[libName.substr(0, libName.lastIndexOf("."))] = text;
                    }));
            }
        }
        this._initializePromise = Promise.all(promises);

        // this._addFile("platform.d.ts", platformLib);
    }

    getStaticCode(name) {
        return this._staticCode[name];
    }

    private _addFile(fileName, text) {
        this._worker.postMessage({ fileName, text });
    }

    addLib(fileName, text) {
        this._addFile(fileName, text);
    }

    compile(fileName: string, text: string): Promise<CompilationResult> {
        return this._initializePromise.then(() => {
            let promise = new Promise<CompilationResult>((resolve, reject) => {
                this._tasks.set(fileName, { resolve, reject });
                this._addFile(fileName, text);
            });

            return promise;
        });
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

