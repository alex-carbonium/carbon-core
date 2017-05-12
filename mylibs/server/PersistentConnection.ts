/*
 State values:
 - notStarted: initial value
 - connecting: connection.start() called, must wait for result
 - connected: connected to server
 - stopping: requested to stop manually (due to idle timeout)
 - stopped: stopped (manually or connection lost)
 - waiting: waiting to reconnect after timeout

 Scenarios:
 - Connection auto started on first save
 - Idle timeout, online only: connection stopped, auto save stopped
 - Idle timeout, offline enabled: connection stopped, auto save still running to save offline
 - Connection lost: auto save disabled, connection scheduled to reconnect
 - Reconnect scheduled and Ctrl+S is pressed: must retry immediately
 - Auto save scheduled in 1 minute and Ctrl+S is pressed: must save immediately
 */

import logger from "../logger";
import params from "../params";
import StateMachine from "../StateMachine";
import DiscoverProxy from "./DiscoverProxy";
import bluebird from "bluebird";
import { IDisposable } from "carbon-basics";
import { IBackend, ConnectionState } from "carbon-api";

require<any>("../DebugUtil")("carb:signalr");

var connectionStartTime;
var noWsTransport = ['serverSentEvents', 'foreverFrame', 'longPolling'];

export default class PersistentConnection extends StateMachine<ConnectionState> {
    [name: string]: any;
    private backendToken: IDisposable;

    constructor(app, private backend: IBackend) {
        super({type: "notStarted"});
        this._app = app;
        this._lastErrorCode = 0;

        this._app.persistentConnection = this;
        this.connectionTimeout = 2000;
    }
    start(timeout?) {
        if (!this.backendToken) {
            this.backendToken = this.backend.accessTokenChanged.bind(this, this.updateQueryString);
        }
        if (this.state.type === "connecting") {
            return this._startPromise;
        }
        this._startPromise = this.restartConnection(timeout || 0);

        return this._startPromise
            .then(proxy => {
                this.changeState({type: "connected"});
                return proxy;
            })
            .catch(e => {
                this.changeState({type: "stopped", idle: false});
                throw e;
            });
    }
    stop(newState: ConnectionState = {type: "goingIdle"}) {
        if (this.backendToken) {
            this.backendToken.dispose();
            this.backendToken = null;
        }
        if (this.state.type === "stopped" || this.state.type === "goingIdle" || this.state.type === "shuttingDown" || this.state.type === "notStarted") {
            return;
        }
        if (this.state.type === "waiting") {
            if (this._restartPromise) {
                this._restartPromise.cancel();
            }
            return;
        }
        this.changeState(newState);
        this._connection.stop();
    }
    getModelSyncHub() {
        switch (this.state.type) {
            case "notStarted":
            case "waiting":
            case "goingIdle":
            case "shuttingDown":
            case "stopped":
                return this.start();
            case "connecting":
                return this._startPromise;
            case "connected":
                return Promise.resolve(this._hub);
        }
        assertNever(this.state)
    }
    resetConnectionTimeout() {
        this.connectionTimeout = PersistentConnection.saveInterval * 1000;
        return this.connectionTimeout;
    }
    backOffConnectionTimeout() {
        this.connectionTimeout = Math.min(10 * 60 * 1000, this.connectionTimeout * 2);
        return this.connectionTimeout;
    }

    private resolveConnectionAddress(app): Promise<string> {
        return DiscoverProxy.projectHub(app.companyId(), app.id())
            .then(data => data.url);
    }

    private setupConnection(url: string) {
        var app = this._app;

        var connection = $['hubConnection'](url);
        if (DEBUG) {
            connection.logging = window['debug'].enabled("carb:signalr");
        }

        var hub = connection.createHubProxy('modelSyncHub');
        hub.on('modelChanged', function (primitives, fromVersion, toVersion) {
            app.changedExternally.raise(primitives, fromVersion, toVersion);
        });

        connection.disconnected(() => {
            var goingIdle = this.state.type === "goingIdle";
            var shuttingDown = this.state.type === "shuttingDown";

            if (!app.quitting && !goingIdle && !shuttingDown) {
                var runtime = new Date().getTime() - connectionStartTime;
                logger.warn("SignalR connection disconnected");
                window['sketch'].analytics.event("Connection", "disconnected", "", runtime);
            }

            if (!goingIdle) {
                app.isInOfflineMode(true);
            }

            this.changeState({type: "stopped", idle: goingIdle});

            if (!goingIdle && !shuttingDown) {
                this.start(this.backOffConnectionTimeout());
            }
        });

        connection.connectionSlow(function () {
            logger.trackEvent("ConnectionSlow");
        });
        connection.reconnecting(function () {
            logger.info("Reconnecting");
        });

        app.offlineModeChanged.bind(this, function () {
            if (!app.isInOfflineMode()) {
                this.start();
            }
        });

        return { connection: connection, hub: hub };
    }

    private restartConnection(timeout) {
        var transport = params.transport === 'nows' ? noWsTransport : params.transport;
        var app = this._app;

        var initialStart = !this._connection;
        var possiblyOldToken = this._lastErrorCode === 401;

        if (this._restartPromise) {
            this._restartPromise.cancel();
        }

        this._restartPromise = bluebird.delay(timeout)
            .then(() => this.backend.ensureLoggedIn(initialStart || possiblyOldToken))
            .then(() => this.resolveConnectionAddress(app))
            .then(url => {
                if (initialStart) {
                    var connectionData = this.setupConnection(url);
                    this._connection = connectionData.connection;
                    this._hub = connectionData.hub;
                }

                this.updateQueryString();

                this.changeState({type: "connecting"});
                return this._connection.start({ transport: transport, withCredentials: false })
                    .done(e => {
                        this.resetConnectionTimeout();
                        app.isInOfflineMode(false);
                        window['sketch'].analytics.event("Connection", initialStart ? "connected" : "reconnected", e.transport.name);
                        return this._hub;
                    })
                    .fail(e => {
                        window['sketch'].analytics.event("Connection", initialStart ? "connectFailed" : "reconnectFailed", "");
                        if (e.source) {
                            this._lastErrorCode = e.source.status;
                        }
                    });
            })
            .then(() => this._hub);

        this.changeState({type: "waiting", timeout: timeout});

        return this._restartPromise;
    }

    private updateQueryString() {
        if (this._connection) {
            this._connection.qs = this.backend.encodeUriData({
                access_token: this.backend.getAccessToken(),
                sessionId: this.backend.sessionId
            });
        }
    }


    static saveInterval: number = 4;
}