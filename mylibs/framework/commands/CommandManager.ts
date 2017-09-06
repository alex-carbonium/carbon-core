import EventHelper from "../EventHelper";
import { IEvent, ICommand } from "carbon-core";
import Environment from "../../environment";

var debug = require("DebugUtil")("carb:commands");

class CommandManager {
    stateChanged: IEvent<{canRedo: boolean, canUndo: boolean}>;
    private index: number;
    private stack: ICommand[];

    constructor() {
        this.stack = [];
        this.index = -1;
        this.stateChanged = EventHelper.createEvent();
    }

    _setProperties(canUndo, canRedo) {
        this.stateChanged.raise({ canUndo, canRedo });
    }

    registerExecutedCommand(cmd: ICommand) {
        debug("command executed %o", cmd);
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
        if (this.index < 0) {
            return;
        }

        var cmd = this.stack[this.index--];
        debug("command undo %o", cmd);
        cmd.rollback();

        this._setProperties(this.index >= 0, true);
    }

    redoNext() {
        if (this.index >= this.stack.length - 1) {
            return;
        }

        var cmd = this.stack[++this.index];
        debug("command redo %o", cmd);
        cmd.execute(true);

        this._setProperties(true, this.index < this.stack.length - 1);
    }

    clear(){
        this.stack.length = 0;
        this.index = -1;
        debug("clear");
    }
}

export default new CommandManager();