class IsolationContext {
    private _layer = null;
    setIsolationLayer(layer) {
        this._layer = layer;
    }

    isActivatedFor(element) {
        if(this._layer) {
            return this._layer.isActivatedFor(element);
        }

        return false;
    }

    get isActive() {
        return this._layer !== null;
    }

    get isolationLayer() {
        return this._layer;
    }
}

export default new IsolationContext();