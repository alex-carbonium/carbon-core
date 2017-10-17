import ContextPool from "./ContextPool";

class ContextCacheManager {
    _cacheModelCompleted: boolean = false;
    experiments: number[] = [64, 128, 256, 512, 1024, 2048];
    observations: number[] = [];

    constructor() {
        setTimeout(() => this.buildCacheModel(), 1000);
    }

    shouldCache(element, size:number, time:number):boolean {
        if(!App.Current.enableRenderCache()) {
            return false;
        }

        return true;

        if(!time || !this._cacheModelCompleted) {
            return false;
        }

        for(var i = 0; i < this.experiments.length; ++i) {
            if(size < this.experiments[i]) {
                var k = size / this.experiments[i];
                if(this.observations[i] * k < time) {
                    return true;
                }

                return false;
            }
        }

        return false;
    }

    free(context) {
        ContextPool.releaseContext(context);
    }

    private buildCacheModel() {
        let destinationCanvas = document.createElement("canvas");
        let sw = this.experiments[this.experiments.length - 1];// window.screen.width;
        let sh = sw;
        destinationCanvas.width = sw;
        destinationCanvas.height = sh;
        let destContext = destinationCanvas.getContext("2d");

        let expCanvas = document.createElement("canvas");
        let expContext = expCanvas.getContext("2d");

        for(var i = 0; i < this.experiments.length; ++i) {
            let size = this.experiments[i];
            expCanvas.width = size;
            expCanvas.height = size;
            expContext.rect(0,0,size, size);
            expContext.fillStyle = 'red';
            expContext.fill();
            this.experiments[i] = size * size;

            let data = destContext.getImageData(0, 0, 1, 1);
            var startTime = performance.now();
            const TestCount = 1000;
            for(var j = 0; j < TestCount; ++j) {
                destContext.drawImage(expCanvas, 64, 128);
            }
            data = destContext.getImageData(0, 0, 1, 1);
            var elapsed = (performance.now() - startTime) / TestCount;
            this.observations.push(elapsed*1.2);
        }
        this._cacheModelCompleted = true;
    }
}

export default new ContextCacheManager();