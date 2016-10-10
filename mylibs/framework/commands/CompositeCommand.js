import Command from "./Command";

export default class CompositeCommand extends Command{
    constructor(commands) {
        super();
        this._commands = commands;
    }
    setCommands(commands){
        this._commands = commands;
    }
    canExecute(){
        if (this._commands){
            for (var i = 0, len = this._commands.length; i < len; ++i) {
                var command = this._commands[i];
                if (!command.canExecute()){
                    return false;
                }
            }
        }
        return true;
    }
    execute() {
        for (var i = 0, len = this._commands.length; i < len; ++i) {
            var command = this._commands[i];
            command.execute();
        }
    }

    rollback() {
        for (var i = this._commands.length - 1; i >= 0; --i) {
            var command = this._commands[i];
            command.rollback();
        }
    }

    toPrimitiveList(rollback){
        var res = [];
        if (rollback){
            for(let i = this._commands.length - 1; i >= 0; --i){
                Array.prototype.push.apply(res, this._commands[i].toPrimitiveList(rollback));
            }
        }
        else{
            for(let i = 0; i < this._commands.length; ++i){
                Array.prototype.push.apply(res, this._commands[i].toPrimitiveList(rollback));
            }
        }
        return res;
    }
}