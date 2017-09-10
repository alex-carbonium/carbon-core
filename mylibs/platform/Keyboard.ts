import EventHelper from "../framework/EventHelper";
import { KeyboardState, IEvent2 } from "carbon-core";

class Keyboard {
    state: KeyboardState;
    changed: any;

    constructor() {
        this.state = { ctrlKey: false, shiftKey: false, altKey: false };
        this.changed = EventHelper.createEvent();
    }
    attach(element) {
        document.addEventListener('keydown', this._onKey);
        document.addEventListener('keyup', this._onKey);
    }
    detach(element) {
        document.removeEventListener('keydown', this._onKey);
        document.removeEventListener('keyup', this._onKey);
    }
    reset() {
        this._change(false, false, false);
    }

    _change(ctrlKey, shiftKey, altKey) {
        if (ctrlKey !== this.state.ctrlKey || altKey !== this.state.altKey || shiftKey !== this.state.shiftKey) {
            var newState = { ctrlKey, altKey, shiftKey };
            var oldState = this.state;
            this.state = newState;
            this.changed.raise(newState, oldState);
        }
    }

    _onKey = e => {
        var ctrl = e.metaKey || e.ctrlKey;
        this._change(ctrl, e.shiftKey, e.altKey);
    };
}

export default new Keyboard();