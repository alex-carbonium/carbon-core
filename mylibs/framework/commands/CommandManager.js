define(["framework/Properties"], function(Properties){
    var fwk = sketch.framework;

    var record = function(entry){
        this.history.push(entry);
        if (this.history.length > 10){
            this.history.shift();
        }
    };

    var CommandManager = klass({
        _constructor: function(){
            this.stack = [];
            this.index = -1;
            this.properties = new Properties();
            this.properties.createProperty('canUndo', 'Undo', false);
            this.properties.createProperty('canRedo', 'Redo', false);
            this.onCommandExecuting = fwk.EventHelper.createEvent();
            this.onCommandExecuted = fwk.EventHelper.createEvent();
            this.onCommandRolledBack = fwk.EventHelper.createEvent();
            this.history = [];
        },

        _setProperties: function(canUndo, canRedo){
            this.properties.set("canUndo", canUndo);
            this.properties.set("canRedo", canRedo);
        },

        execute: function(cmd){
            if (cmd.canExecute() === false){
                return;
            }

            record.call(this, "E:" + cmd.toString());
            this.onCommandExecuting.raise(cmd);
            var result = cmd.execute(false);
            this.onCommandExecuted.raise(cmd);
            if (result === false){
                return;
            }
            this.registerExecutedCommand(cmd);
        },

        registerExecutedCommand: function(cmd){
            if (!cmd.transparent()) {
                this.stack[++this.index] = cmd;
                this._setProperties(true, false);
            }
        },

        createAndExecute: function(id){

            function construct(constructor, args) {
                function F() {
                    return constructor.apply(this, args);
                }
                F.prototype = constructor.prototype;
                return new F();
            }

            var cmd = construct(sketch.commands[id], arguments);
            cmd.execute();
            this.onCommandExecuted.raise(cmd);
            this.stack[++this.index] = cmd;
            this._setProperties(true, false);
        },

        undoPrevious: function(){
            var cmd = this.stack[this.index--];
            record.call(this, "U:" + cmd.toString());
            cmd.rollback();
            this.onCommandRolledBack.raise(cmd);
            this._setProperties(this.index >= 0, true);
        },

        redoNext: function(){
            var cmd = this.stack[++this.index];
            record.call(this, "R:" + cmd.toString());
            cmd.execute(true);
            this.onCommandExecuted.raise(cmd, true);
            this._setProperties(true, this.index < this.stack.length - 1);
        },

        canUndo: function(){
            return this.properties.canUndo.value();
        },
        canRedo: function(){
            return this.properties.canRedo.value();
        },

        subscribe: function(CommandKlass, handler) {
            if (!CommandKlass){
                throw "Trying to subscribe for an unknown command";
            }
            return this.onCommandExecuted.bind(function(cmd){
                if (cmd instanceof CommandKlass){
                    handler(cmd);
                }
            });
        },
        subscribeRolledBack: function(CommandKlass, handler){
            if (!CommandKlass){
                throw "Trying to subscribe for an unknown command";
            }
            return this.onCommandRolledBack.bind(function(cmd){
                if (cmd instanceof CommandKlass){
                    handler(cmd);
                }
            });
        },

        getLastCommands: function(){
            return this.history;
        }
    });

    fwk.commandManager = new CommandManager();

    return fwk.commandManager;
});
