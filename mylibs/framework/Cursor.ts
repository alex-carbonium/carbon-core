import EventHelper from "framework/EventHelper";

class Cursor {
    [name: string]: any;

    constructor(){
        this.changed = EventHelper.createEvent();
        this._hasGlobalCursor = false;
        this._cursor = null;
    }

    setCursor(value: string): boolean {
        if (this._cursor !== value) {
            var old = this._cursor;
            this._cursor = value;
            this.changed.raise(value, old);
            return true;
        }
        return false;
    }

    getCursor(): string{
        return this._cursor;
    }

    setGlobalCursor(value: string) {
        this._hasGlobalCursor = true;
        this.setCursor(value)
    }

    getGlobalCursor(): string{
        if (this._hasGlobalCursor){
            return this._cursor;
        }
        return null;
    }

    hasGlobalCursor(){
        return this._hasGlobalCursor;
    }

    removeGlobalCursor() {
        if (this._hasGlobalCursor){
            this._hasGlobalCursor = false;
        }
    }
}

export default new Cursor();