import { IElementWithCode } from "carbon-model";
import Services from "Services";
import { IDisposable } from "carbon-basics";

interface ICodeCacheItem {
    text: string;
    version: number;
}

export class CompiledCodeProvider implements IDisposable {
    private _codeCache: WeakMap<IElementWithCode, ICodeCacheItem> = new WeakMap<IElementWithCode, ICodeCacheItem>();

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
        Services.compiler.addLib(element.id + ".d.ts", element.declaration(true))

        return Services.compiler.compile(fileName, code).then((result) => {
            this._codeCache.set(element, { version: element.version, text: result });
            return result;
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