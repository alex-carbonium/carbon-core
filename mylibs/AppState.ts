import commandManager from "framework/commands/CommandManager";
import Primitive from "framework/sync/Primitive_Handlers";
import Rollbacks from "framework/sync/Rollbacks";
import eventHelper from "framework/EventHelper";
import DeferredPrimitives from "./framework/sync/DeferredPrimitives";

var subscribe = function(){
    if (this.disposed){
        return;
    }
    var that = this;

    var s = commandManager.onCommandExecuting.bind(function(){
        if (that.app.isLoaded){ //to avoid startup commands
            that.app.commandExecuting = true;
        }
    });
    this.registerForDisposal(s);

    s = commandManager.onCommandExecuted.bind(function(cmd, redo){
        var primitives = cmd.toPrimitiveList();
        if(primitives && primitives.length) {
            var rollbacks = [];
            if(!cmd.rollbacks) {
                for (var i = 0; i < primitives.length; i++) {
                    var primitive = primitives[i];
                    if (primitive instanceof Array) {
                        for (var i = 0; i < primitive.length; ++i) {
                            var r = Rollbacks.create(primitive[i], that.app);
                            if (r) {
                                rollbacks.push(r);
                            }
                        }
                    }
                    else if (primitive) {
                        var r = Rollbacks.create(primitive, that.app);
                        if (r) {
                            rollbacks.push(r);
                        }
                    }
                }
                cmd.rollbacks = rollbacks;
            }
            if (redo){
                primitives.forEach(x => DeferredPrimitives.register(x));
            }
        }
        that.app.commandExecuting = false;
    });
    this.registerForDisposal(s);

    s = commandManager.onCommandRolledBack.bind(function(cmd) {
        var primitives = cmd.rollbacks || cmd.toPrimitiveList(true);
        if (primitives) {
            for (var i = 0; i < primitives.length; i++){
                var p = primitives[i];
                if(p) {
                    p._rollback = true;
                    DeferredPrimitives.register(p);
                }
            }
        }
    });
    this.registerForDisposal(s);

    that._isDirty = false;

    this.app.offlineModel.syncLogCleaned = function() {
        that.isDirty(false);
    };
};

export default class AppState {
    [name: string]: any;

    constructor(app) {
        this.app = app;
        this._subscriptions = [];

        this.changed = eventHelper.createEvent();
        this.pageModified = eventHelper.createEvent();

        app.loadedLevel1.then(subscribe.bind(this));
    }

    setExternalChange(value){
        this._externalChange = value;
    }
    isExternalChange(){
        return this._externalChange;
    }
    registerForDisposal(s){
        this._subscriptions.push(s);
    }

    isDirty(value?){
        if (arguments.length === 1){
            this._isDirty = value;
            this.changed.raise(value);
        }
        return this._isDirty;
    }

    dispose(){
        if (this._subscriptions){
            for (var i = 0; i < this._subscriptions.length; i++){
                var s = this._subscriptions[i];
                s.dispose();
            }
            this._subscriptions = null;
        }
        this.disposed = true;
    }
}
