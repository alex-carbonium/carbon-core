import eventHelper from "framework/EventHelper";
import { IApp, IEvent } from "carbon-core";

export default class AppState {
    private _isDirty: boolean;
    private _externalChange: boolean;

    disposed: boolean;
    changed: IEvent<boolean>;

    constructor(private app: IApp) {
        this.changed = eventHelper.createEvent();

        app.onLoad(this.subscribe);
    }

    subscribe = () => {
        if (this.disposed) {
            return;
        }
        this._isDirty = false;
    }

    setExternalChange(value) {
        this._externalChange = value;
    }
    isExternalChange() {
        return this._externalChange;
    }

    isDirty(value?) {
        if (arguments.length === 1) {
            this._isDirty = value;
            this.changed.raise(value);
        }
        return this._isDirty;
    }

    dispose() {
        this.disposed = true;
    }
}