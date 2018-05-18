export function EventData(props) {
    Object.assign(this, props);
}

EventData.prototype.preventDefault = function preventDefault() {
    this._preventDefault = true;
}

EventData.prototype.stopPropagation = function stopPropagation() {
    this._stopPropagation = true;
}

EventData.prototype.isDefaultPrevented = function isDefaultPrevented() {
    return !!this._preventDefault;
}

EventData.prototype.isPropagationStopped = function isPropagationStopped() {
    return !!this._stopPropagation;
}