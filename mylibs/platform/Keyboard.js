import EventHelper from "../framework/EventHelper";

class Keyboard{
    constructor(){
        this.state = {ctrl: false, shift: false, alt: false};
        this.changed = EventHelper.createEvent();
    }
    attach(element){
        element.addEventListener('keydown', this._onKey);
        element.addEventListener('keyup', this._onKey);
    }
    detach(element){
        element.removeEventListener('keydown', this._onKey);
        element.removeEventListener('keyup', this._onKey);
    }

    _onKey = e => {
        var ctrl = e.metaKey || e.ctrlKey;
        if (ctrl !== this.state.ctrl || e.altKey !== this.state.alt || e.shiftKey !== this.state.shift){
            var newState = {alt: e.altKey, ctrl, shift: e.shiftKey};
            var oldState = this.state;
            this.state = newState;
            this.changed.raise(newState, oldState);
        }
    };
}

export default new Keyboard();