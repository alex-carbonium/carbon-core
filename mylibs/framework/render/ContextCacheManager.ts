import ContextPool from "./ContextPool";
import { IContext } from "carbon-rendering";
import { LRUCache } from "../collections/LRUCache";

interface IRenderCacheItem {
    scale: number;
    context: IContext;
    key: number;
}


class ContextCacheManager {
    _cacheModelCompleted: boolean = false;
    experiments: number[] = [64, 128, 256, 512, 1024, 2048];
    observations: number[] = [];
    totalSize: number = 0;
    cache: LRUCache<IContext> = new LRUCache<IContext>(100 * 1024 * 1024, this._releaseContext);

    constructor() {
        setTimeout(() => this.buildCacheModel(), 1000);
    }

    shouldCache(element, size: number, time: number): boolean {
        if (!App.Current.enableRenderCache()) {
            return false;
        }

        if (!time || !this._cacheModelCompleted) {
            return false;
        }

        for (var i = 0; i < this.experiments.length; ++i) {
            if (size < this.experiments[i]) {
                var k = size / this.experiments[i];
                if (this.observations[i] * k < time) {
                    return true;
                }

                return false;
            }
        }

        return false;
    }

    _releaseContext(context) {
        ContextPool.releaseContext(context);
    }

    free(element) {
        if (element.runtimeProps.rc) {
            this.cache.remove(element.runtimeProps.rc);
            delete element.runtimeProps.rc;
        }
    }

    getCacheItem(element, scale:number): IContext {
        var rc = element.runtimeProps.rc;
        if (rc) {
            let item = this.cache.get(rc);
            if (!item) {
                element.runtimeProps.rc = null;
            } else {
                return item;
            }
        }
    }

    addCacheItem(element, context: IContext, scale:number) {
        var key = this.cache.add(context, context.width * context.height * 4);
        element.runtimeProps.rc = key;
    }

    private buildCacheModel() {
        let destinationCanvas = document.createElement("canvas");
        let sw = this.experiments[this.experiments.length - 1];
        let sh = sw;
        destinationCanvas.width = sw;
        destinationCanvas.height = sh;
        let destContext = destinationCanvas.getContext("2d");

        let expCanvas = document.createElement("canvas");
        let expContext = expCanvas.getContext("2d");

        for (var i = 0; i < this.experiments.length; ++i) {
            let size = this.experiments[i];
            expCanvas.width = size;
            expCanvas.height = size;
            expContext.rect(0, 0, size, size);
            expContext.fillStyle = 'red';
            expContext.fill();
            this.experiments[i] = size * size;

            let data = destContext.getImageData(0, 0, 1, 1);
            var startTime = performance.now();
            const TestCount = 100;
            for (var j = 0; j < TestCount; ++j) {
                destContext.drawImage(expCanvas, 64, 128);
            }
            var elapsed = (performance.now() - startTime) / TestCount;
            this.observations.push(elapsed * 1.2);
        }
        this._cacheModelCompleted = true;
    }
}

export default new ContextCacheManager();