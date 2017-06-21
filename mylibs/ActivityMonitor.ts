import StateMachine from "./StateMachine";
import { IApp, ConnectionState, IDisposable } from "carbon-core";
import AutoSaveTimer from "./AutoSaveTimer";
import PersistentConnection from "./server/PersistentConnection";

const IdleTimeout = 30 * 60 * 1000;

type ActivityMonitorState =
    { type: "notStarted" } |
    { type: "active" } |
    { type: "idle" };

export default class ActivityMonitor extends StateMachine<ActivityMonitorState> {
    private _stateToken: IDisposable;
    private lastHeartbeat: Date;

    constructor(private app: IApp, private persistentConnection: PersistentConnection, private autoSaveTimer: AutoSaveTimer) {
        super({ type: "notStarted" });

        this.persistentConnection.stateChanged.bind(this, this.connectionStateChanged);

        this.autoSaveTimer.tick.bind(this, this.onAutoSaved);
        this.app.changed.bind(this, this.onAppChanged);
    }

    activate() {
        if (this.state.type === "active") {
            return;
        }
        this.lastHeartbeat = new Date();
        this.changeState({type: "active"});
        this.autoSaveTimer.start();
    }

    deactivate(newState: ConnectionState) {
        this.changeState({type: "idle"});
        this.persistentConnection.stop(newState);
    }

    ensureActive() {
        if (this.state.type !== "active") {
            this.activate();
        }
    }

    private connectionStateChanged(newState: ConnectionState) {
        if (newState.type === "stopped") {
            if (!this.app.isInOfflineMode()) {
                this.changeState({type: "idle"});
                this.autoSaveTimer.stop();

                if (newState.idle) {
                    if (!this._stateToken) {
                        this._stateToken = this.app.state.changed.bindAsync(this, function (dirty) {
                            if (this._stateToken && dirty) {
                                this.activate();
                                this._stateToken.dispose();
                                delete this._stateToken;
                            }
                        });
                    }
                }
            }
        }
        else if (newState.type === "connected") {
            this.activate();
        }
    }

    private onAutoSaved(saved) {
        if (!saved && new Date().getTime() - this.lastHeartbeat.getTime() >= IdleTimeout && !this.app.isDirty()) {
            this.deactivate({type: "goingIdle"});
        }
    }

    private onAppChanged() {
        this.lastHeartbeat = new Date();
    }
}