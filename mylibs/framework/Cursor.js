import EventHelper from "framework/EventHelper";

class Cursor {
    constructor(){
        this.changed = EventHelper.createEvent();
        this._globalCursor = null;
        this._defaultCursor = null;
        this._cursor = null;
    }

    setCursor(value) {
        if (this._cursor !== value) {
            this.changed.raise(value, this._cursor);
            this._cursor = value;
        }
    }

    setGlobalCursor(value, updateImmediately) {
        this._globalCursor = value;
        if (updateImmediately) {
            this.setCursor(value);
        }
    }

    hasGlobalCursor(){
        return this._globalCursor !== null;
    }

    removeGlobalCursor(updateImmediately) {
        this._globalCursor = null;
        if (updateImmediately)
            this.setCursor(this._defaultCursor);
    }

    setDefaultCursor(value) {
        var cursor = this._defaultCursor;
        if (value !== cursor) {
            if (cursor){
                document.body.classList.remove("c-" + cursor);
            }
            if (value){
                document.body.classList.add("c-" + value);
            }
            this._defaultCursor = value;
        }
        return cursor;
    }
}

export default new Cursor();