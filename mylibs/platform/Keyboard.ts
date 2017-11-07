import EventHelper from "../framework/EventHelper";
import { KeyboardState, IEvent2, IKeyboard } from "carbon-core";

class Keyboard implements IKeyboard {
    state: KeyboardState = { ctrlKey: false, shiftKey: false, altKey: false };
    changed = EventHelper.createEvent2<KeyboardState, KeyboardState>();

    attach() {
        document.addEventListener('keydown', this._onKey);
        document.addEventListener('keyup', this._onKey);
    }
    detach() {
        document.removeEventListener('keydown', this._onKey);
        document.removeEventListener('keyup', this._onKey);
    }
    reset() {
        this.change(false, false, false);
    }

    change(ctrlKey: boolean, shiftKey: boolean, altKey: boolean) {
        if (ctrlKey !== this.state.ctrlKey || altKey !== this.state.altKey || shiftKey !== this.state.shiftKey) {
            var newState = { ctrlKey, altKey, shiftKey };
            var oldState = this.state;
            this.state = newState;
            this.changed.raise(newState, oldState);
        }
    }

    _onKey = e => {
        var ctrl = e.metaKey || e.ctrlKey;
        this.change(ctrl, e.shiftKey, e.altKey);
    };
}

export const keyboard = new Keyboard();