import logger from "./logger";
import StateMachine from "./StateMachine";

var tickInterval = 4 * 1000;
var lastSaveTime = 0;

function autoSave(timeout){
    if (this.state === "stopped"){
        return;
    }
    if (this._timer){
        clearTimeout(this._timer);
    }

    var app = this._app;
    var autoSaveInterval = this._saveInterval * 1000;
    this._timer = setTimeout(function(){
        try{
            var saved;
            var timeLeft = lastSaveTime + autoSaveInterval - new Date().valueOf();
            var isDirty = app.state.isDirty() || (app.id() && !app.isSaved() && !app.isInOfflineMode());

            if ((timeLeft <= 0 && isDirty) || app.syncBroken()){
                this.saveInProgress = true;
                app.actionManager.invoke("save", function(success, e){
                    if (DEBUG){
                        if (success){
                            logger.trace("Autosave successful");
                        }
                    }
                    if (!success){
                        logger.warn("Autosave failed", e);
                    }

                    this.saveInProgress = false;
                    autoSave.call(this, tickInterval);
                }.bind(this));

                saved = true;
                lastSaveTime = new Date().valueOf();
            } else{
                autoSave.call(this, tickInterval);
                saved = false;
            }

            this.tick.raise(saved, timeLeft);
            this.lastTickTime = new Date();
        } catch (e){
            logger.error("Autosave failed", e);
            autoSave.call(this, tickInterval);
        }
    }.bind(this), timeout);
}

export default class AutoSaveTimer extends StateMachine {
    constructor(app, saveInterval){
        super();
        this._app = app;
        this.tick = sketch.framework.EventHelper.createEvent();
        this.state = "notStarted";
        this._app.autoSaveTimer = this;
        this._saveInterval = saveInterval;
    }

    start(){
        if (this.state === "started"){
            return;
        }

        this.changeState("started");

        if (this._app.isNew()){
            this.waitForChanges();
        }
        else{
            autoSave.call(this, 0);
        }
    }

    stop(){
        if (this.state === "stopped"){
            return;
        }

        this.changeState("stopped");

        if (this._timer){
            clearTimeout(this._timer);
        }
        if (this._stateToken){
            this._stateToken.dispose();
            delete this._stateToken;
        }
    }

    waitForChanges(){
        if (this._stateToken){
            return;
        }
        this._stateToken = this._app.state.changed.bind(this, function(dirty){
            if (dirty){
                autoSave.call(this, 0);
                this._stateToken.dispose();
                delete this._stateToken;
            }
        });
    }
}
