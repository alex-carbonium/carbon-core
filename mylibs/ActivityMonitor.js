import StateMachine from "./StateMachine";

var lastHeartbeat;
var idleTimeout = DEBUG ? 60 * 1000 : 10 * 60 * 1000;

function onAutoSaved(saved){
    if (!saved && new Date() - lastHeartbeat >= idleTimeout && !this._app.state.isDirty()){
        this.deactivate();
    }
}

function onAppChanged(){
    lastHeartbeat = new Date();
}

function connectionStateChanged(newState, idle){
    if (newState === "stopped"){
        if (!this._app.isInOfflineMode()){
            this.changeState("idle");
            this._autoSaveTimer.stop();

            if (idle){
                if (!this._stateToken){
                    this._stateToken = this._app.state.changed.bindAsync(this, function(dirty){
                        if (this._stateToken && dirty){
                            this.activate();
                            this._stateToken.dispose();
                            delete this._stateToken;
                        }
                    });
                }
            }
        }
    }
    else if (newState === "connected"){
        this.activate();
    }
}

export default class ActivityMonitor extends StateMachine {
    constructor(app, persistentConnection, autoSaveTimer){
        super();
        this._app = app;

        this._persistentConnection = persistentConnection;
        this._persistentConnection.stateChanged.bind(this, connectionStateChanged);

        this._autoSaveTimer = autoSaveTimer;
        this._autoSaveTimer.tick.bind(this, onAutoSaved);
        this._app.changed.bind(this, onAppChanged);

        this.state = "notStarted";
    }

    activate(){
        if (this.state === "active"){
            return;
        }
        lastHeartbeat = new Date();
        this.changeState("active");
        this._autoSaveTimer.start();
    }

    deactivate(){
        this.changeState("idle");
        this._persistentConnection.stop();
    }

    ensureActive(){
        if (this.state !== "active"){
            this.activate();
        }
    }
}