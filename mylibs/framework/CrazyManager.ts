class CrazyManager {
    [name: string]: any;
    constructor() {
        this.isCrazy = false;
        this.offset = 1.8;
        this._stack = [];
    }
    push(value) {
        this._stack.push(this.isCrazy);
        this.isCrazy = value;
    }
    pop() {
        this.isCrazy = this._stack.pop();
    }
    get() {
        return this.isCrazy;
    }
}

export default new CrazyManager();