import EventHelper from "../framework/EventHelper";
import { IKeyboardState, IEvent2 } from "../framework/CoreModel";

class Keyboard {
    state: IKeyboardState;
    changed: IEvent2<IKeyboardState, IKeyboardState>;

    constructor() {
        this.state = { ctrl: false, shift: false, alt: false };
        this.changed = EventHelper.createEvent();
    }
    attach(element) {
        element.addEventListener('keydown', this._onKey);
        element.addEventListener('keyup', this._onKey);
    }
    detach(element) {
        element.removeEventListener('keydown', this._onKey);
        element.removeEventListener('keyup', this._onKey);
    }
    reset() {
        this._change(false, false, false);
    }

    _change(ctrl, shift, alt) {
        if (ctrl !== this.state.ctrl || alt !== this.state.alt || shift !== this.state.shift) {
            var newState = { ctrl, alt, shift };
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