import EventHelper from "framework/EventHelper";

class Cursor {
    constructor(){
        this.changed = EventHelper.createEvent();
        this._hasGlobalCursor = false;
        this._lastGlobalCursor = null;
        this._cursor = null;
    }

    setCursor(value) {
        var old = this._cursor;
        if (this._cursor !== value) {
            this._cursor = value;
            this.changed.raise(value, old);
        }
        return old;
    }

    setGlobalCursor(value) {
        this._hasGlobalCursor = true;
        this._lastGlobalCursor = this.setCursor(value);
    }

    hasGlobalCursor(){
        return this._hasGlobalCursor;
    }

    removeGlobalCursor() {
        if (this._hasGlobalCursor){
            this._hasGlobalCursor = false;
            this.setCursor(this._lastGlobalCursor);
        }
    }
}

export default new Cursor();