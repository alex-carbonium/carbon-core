import logger from "./logger";
import StateMachine from "./StateMachine";
import { IApp, IEvent2, IDisposable } from "carbon-core";
import EventHelper from "./framework/EventHelper";

const TickInterval = 4 * 1000;

type TimerState =
    { type: "notStarted" } |
    { type: "started" } |
    { type: "stopped" };


export default class AutoSaveTimer extends StateMachine<TimerState> {
    saveInProgress: boolean;
    lastSaveTime: number;
    lastTickTime: Date;
    _stateToken: IDisposable;
    _timer: number;
    _lastSaveTime: number;
    tick: IEvent2<boolean, number>;

    constructor(private app: IApp, private saveInterval: number) {
        super({type: "notStarted"});

        this.tick = EventHelper.createEvent2<boolean, number>();
        this._lastSaveTime = 0;
    }

    start() {
        if (this.state.type === "started") {
            return;
        }

        this.changeState({type: "started"});

        if (this.app.isNew()) {
            this.waitForChanges();
        }
        else {
            this.autoSave(0);
        }
    }

    stop() {
        if (this.state.type === "stopped") {
            return;
        }

        this.changeState({type: "stopped"});

        if (this._timer) {
            clearTimeout(this._timer);
        }
        if (this._stateToken) {
            this._stateToken.dispose();
            delete this._stateToken;
        }
    }

    waitForChanges() {
        if (this._stateToken) {
            return;
        }
        this._stateToken = this.app.state.changed.bind(this, function (dirty) {
            if (dirty) {
                this.autoSave(0);
                this._stateToken.dispose();
                delete this._stateToken;
            }
        });
    }

    private autoSave(timeout) {
        if (this.state.type === "stopped") {
            return;
        }
        if (this._timer) {
            clearTimeout(this._timer);
        }

        var app = this.app;
        var autoSaveInterval = this.saveInterval * 1000;
        this._timer = setTimeout(() => {
            try {
                var saved;
                var timeLeft = this._lastSaveTime + autoSaveInterval - new Date().valueOf();
                var isDirty = app.state.isDirty() || (app.id() && !app.isSaved() && !app.isInOfflineMode());

                if ((timeLeft <= 0 && isDirty) || app.syncBroken()) {
                    this.saveInProgress = true;
                    app.actionManager.invoke("save", (success, e) => {
                        if (DEBUG) {
                            if (success) {
                                logger.trace("Autosave successful");
                            }
                        }
                        if (!success) {
                            logger.warn("Autosave failed", e);
                        }

                        this.saveInProgress = false;
                        if (this.state.type === "started"){
                            this.autoSave(TickInterval);
                        }
                    });

                    saved = true;
                    this.lastSaveTime = new Date().getTime();
                }
                else {
                    this.autoSave(TickInterval);
                    saved = false;
                }

                this.tick.raise(saved, timeLeft);
                this.lastTickTime = new Date();
            }
            catch (e) {
                logger.error("Autosave failed", e);
                this.autoSave(TickInterval);
            }
        }, timeout);
    }
}
