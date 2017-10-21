import ContextPool from "./ContextPool";
import { IContext } from "carbon-rendering";
import { LRUCache } from "../collections/LRUCache";

interface IRenderCacheItem {
    scale: number;
    ref: { value: { value: IContext } };
}


class ContextCacheManager {
    _cacheModelCompleted: boolean = false;
    experiments: number[] = [64, 128, 256, 512, 1024, 2048];
    observations: number[] = [];
    totalSize: number = 0;
    cache: LRUCache<IContext> = new LRUCache<IContext>(100 * 1024 * 1024);
    maxCacheItemSize = 16 * 1024 * 1024;

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

        if (size > this.maxCacheItemSize) {
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
        let rc: IRenderCacheItem[] = element.runtimeProps.rc;
        if (rc) {
            for (var i = 0; i < rc.length; ++i) {
                this.cache.remove(rc[i].ref as any);
            }
            delete element.runtimeProps.rc;
        }
    }

    getCacheItem(element, scale: number): IRenderCacheItem {
        var rc: IRenderCacheItem[] = element.runtimeProps.rc;
        var minrci = null;
        var mindist = Number.MAX_VALUE;
        if (rc && rc.length) {
            for (let i = rc.length - 1; i >= 0; --i) {
                let rci = rc[i];
                if (rci.ref.value === null) {
                    rc.splice(i, 1);
                    continue;
                }
                if (rci.scale === scale) {
                    this.cache.use(rci.ref as any);
                    return rci;
                } else {
                    let dist = Math.abs(rci.scale - scale);
                    if (dist < mindist) {
                        mindist = dist;
                        minrci = rci;
                    }
                }
            }
        }

        return minrci;
    }

    addCacheItem(element, context: IContext, scale: number) {
        var node: any = this.cache.add({ value: context, size: context.width * context.height * 4 });
        let rc: IRenderCacheItem[] = element.runtimeProps.rc = element.runtimeProps.rc || [];
        rc.splice(0, 0, { ref: node, scale });
    }

    private buildCacheModel() {
        var exp = localStorage["render:exp"];
        if (exp) {
            let obs = localStorage["render:obs"];
            this.experiments = JSON.parse(exp);
            this.observations = JSON.parse(obs);
            this._cacheModelCompleted = true;
            return;
        }

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
            this.experiments[i] = size * size * 4;

            let data = destContext.getImageData(0, 0, 1, 1);
            var startTime = performance.now();
            const TestCount = 50;
            for (var j = 0; j < TestCount; ++j) {
                destContext.drawImage(expCanvas, 64, 128);
            }
            var elapsed = (performance.now() - startTime) / TestCount;
            this.observations.push(elapsed * 1.2);
        }

        localStorage["render:exp"] = JSON.stringify(this.experiments);
        localStorage["render:obs"] = JSON.stringify(this.observations);
        this._cacheModelCompleted = true;
    }
}

export default new ContextCacheManager();