import EventHelper from "../EventHelper";

var debug = require("DebugUtil")("carb:commandManager");

class CommandManager {
    [name: string]: any;

    constructor() {
        this.stack = [];
        this.index = -1;
        this.stateChanged = EventHelper.createEvent();
        this.onCommandExecuting = EventHelper.createEvent();
        this.onCommandExecuted = EventHelper.createEvent();
        this.onCommandRolledBack = EventHelper.createEvent();
    }

    _setProperties(canUndo, canRedo) {
        this.stateChanged.raise({ canUndo, canRedo });
    }

    execute(cmd) {
        if (cmd.canExecute() === false) {
            return;
        }

        this.onCommandExecuting.raise(cmd);
        var result = cmd.execute(false);
        this.onCommandExecuted.raise(cmd);
        if (result === false) {
            return;
        }
        this.registerExecutedCommand(cmd);
    }

    registerExecutedCommand(cmd) {
        debug("command executed");
        if (!cmd.transparent()) {
            if (cmd.flushRedoStack()) {
                this.stack[++this.index] = cmd;
                this.stack.length = this.index + 1;
                this._setProperties(true, false);
            } else {
                this.stack.splice(++this.index, 0, cmd);
                this._setProperties(true, this.index < this.stack.length - 1);
            }
        }
    }

    undoPrevious() {
        if (this.index === 0) {
            return;
        }
        debug("command undo");
        var cmd = this.stack[this.index--];
        cmd.rollback();
        this.onCommandRolledBack.raise(cmd);
        this._setProperties(this.index >= 0, true);
    }

    redoNext() {
        if (this.index >= this.stack.length - 1) {
            return;
        }
        debug("command redo");
        var cmd = this.stack[++this.index];
        cmd.execute(true);
        this.onCommandExecuted.raise(cmd, true);
        this._setProperties(true, this.index < this.stack.length - 1);
    }
}

export default new CommandManager();