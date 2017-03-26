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

import backend from "../backend";
import logger from "../logger";
import params from "../params";
import StateMachine from "../StateMachine";
import DiscoverProxy from "./DiscoverProxy";

require<any>("../DebugUtil")("carb:signalr");

var connectionStartTime;
var noWsTransport = ['serverSentEvents', 'foreverFrame', 'longPolling'];

function resolveConnectionAddress(app): Promise<string>{
    return DiscoverProxy.projectHub(app.companyId(), app.id())
        .then(data => data.url);
}

function setupConnection(url: string){
    var app = this._app;

    var connection = $.hubConnection(url);
    if (DEBUG){
        connection.logging = debug.enabled("carb:signalr");
    }

    var hub = connection.createHubProxy('modelSyncHub');
    hub.on('modelChanged', function(primitives, fromVersion, toVersion){
        app.changedExternally.raise(primitives, fromVersion, toVersion);
    });

    connection.disconnected(() => {
        var goingIdle = this.state === "stopping";

        if (!app.quitting && !goingIdle){
            var runtime = new Date() - connectionStartTime;
            logger.warn("SignalR connection disconnected");
            sketch.analytics.event("Connection", "disconnected", "", runtime);
        }

        if (!goingIdle){
            app.isInOfflineMode(true);
        }

        this.changeState("stopped", goingIdle);

        if (!goingIdle){
            this.start(this.backOffConnectionTimeout());
        }
    });

    connection.connectionSlow(function(){
        logger.trackEvent("ConnectionSlow");
    });
    connection.reconnecting(function(){
        logger.info("Reconnecting");
    });

    app.offlineModeChanged.bind(this, function(){
        if (!app.isInOfflineMode()){
            this.start();
        }
    });

    return {connection: connection, hub: hub};
}

function restartConnection(timeout){
    var transport = params.transport === 'nows' ? noWsTransport : params.transport;
    var app = this._app;

    var initialStart = !this._connection;
    var possiblyOldToken = this._lastErrorCode === 401;

    if (this._restartPromise){
        this._restartPromise.cancel();
    }

    this._restartPromise = Promise.delay(timeout)
        .then(() => backend.ensureLoggedIn(initialStart || possiblyOldToken))
        .then(() => resolveConnectionAddress.call(this, app))
        .then(url => {
            if (initialStart){
                var connectionData = setupConnection.call(this, url);
                this._connection = connectionData.connection;
                this._hub = connectionData.hub;
            }

            updateQueryString.call(this);

            this.changeState("connecting");
            return this._connection.start({transport: transport, withCredentials: false})
                .done(e => {
                    this.resetConnectionTimeout();
                    app.isInOfflineMode(false);
                    sketch.analytics.event("Connection", initialStart ? "connected" : "reconnected", e.transport.name);
                    return this._hub;
                })
                .fail(e => {
                    sketch.analytics.event("Connection", initialStart ? "connectFailed" : "reconnectFailed", "");
                    if (e.source){
                        this._lastErrorCode = e.source.status;
                    }
                });
        })
        .then(() => this._hub);

    this.changeState("waiting", timeout);

    return this._restartPromise;
}

function updateQueryString(){
    if (this._connection){
        this._connection.qs = backend.encodeUriData({
            access_token: backend.getAccessToken(),
            sessionId: backend.sessionId
        });
    }
}

class PersistentConnection extends StateMachine{
    constructor(app){
        super();
        this._app = app;
        this._lastErrorCode = 0;

        this._app.persistentConnection = this;
        this.connectionTimeout = 2000;
        this.state = "notStarted";

        backend.accessTokenChanged.bind(this, updateQueryString);
    }
    start(timeout){
        if (this.state === "connecting"){
            return this._startPromise;
        }
        this._startPromise = restartConnection.call(this, timeout || 0);

        return this._startPromise
            .then(proxy => {
                this.changeState("connected");
                return proxy;
            })
            .catch(e => {
                this.changeState("stopped");
                throw e;
            });
    }
    stop(){
        if (this.state === "stopped" || this.state === "stopping" || this.state === "notStarted"){
            return;
        }
        if (this.state === "waiting"){
            if (this._restartPromise){
                this._restartPromise.cancel();
            }
            return;
        }
        this.changeState("stopping");
        this._connection.stop();
    }
    getModelSyncHub(){
        switch (this.state){
            case "notStarted":
            case "waiting":
            case "stopped":
                return this.start();
            case "connecting":
                return this._startPromise;
            case "connected":
                return Promise.resolve(this._hub);
            default:
                return Promise.reject();
        }
    }
    resetConnectionTimeout(){
        this.connectionTimeout = PersistentConnection.saveInterval * 1000;
        return this.connectionTimeout;
    }
    backOffConnectionTimeout(){
        this.connectionTimeout = Math.min(10 * 60 * 1000, this.connectionTimeout * 2);
        return this.connectionTimeout;
    }
}

PersistentConnection.saveInterval = 4;

export default PersistentConnection;