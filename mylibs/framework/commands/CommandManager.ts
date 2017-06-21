import EventHelper from "../EventHelper";
import Command from "./Command";
import { IEvent } from "carbon-core";

var debug = require("DebugUtil")("carb:commandManager");

class CommandManager {
    stateChanged: IEvent<{canRedo: boolean, canUndo: boolean}>;
    private index: number;
    private stack: Command[];

    constructor() {
        this.stack = [];
        this.index = -1;
        this.stateChanged = EventHelper.createEvent();
    }

    _setProperties(canUndo, canRedo) {
        this.stateChanged.raise({ canUndo, canRedo });
    }

    registerExecutedCommand(cmd: Command) {
        debug("command executed");
        if (cmd.flushRedoStack()) {
            this.stack[++this.index] = cmd;
            this.stack.length = this.index + 1;
            this._setProperties(true, false);
        } else {
            this.stack.splice(++this.index, 0, cmd);
            this._setProperties(true, this.index < this.stack.length - 1);
        }
    }

    undoPrevious() {
        if (this.index === 0) {
            return;
        }
        debug("command undo");
        var cmd = this.stack[this.index--];
        cmd.rollback();
        this._setProperties(this.index >= 0, true);
    }

    redoNext() {
        if (this.index >= this.stack.length - 1) {
            return;
        }
        debug("command redo");
        var cmd = this.stack[++this.index];
        cmd.execute(true);
        this._setProperties(true, this.index < this.stack.length - 1);
    }

    clear(){
        this.stack.length = 0;
        this.index = -1;
    }
}

export default new CommandManager();