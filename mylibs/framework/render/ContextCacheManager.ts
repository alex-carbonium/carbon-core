import ContextPool from "./ContextPool";

class ContextCacheManager {
    shouldCache(size:number, time:number):boolean {
        return true;
    }

    free(context) {
        ContextPool.releaseContext(context);
    }
}

export default new ContextCacheManager();