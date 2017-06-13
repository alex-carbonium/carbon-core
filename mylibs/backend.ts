import globals from "./globals";
import logger, { Logger } from "./logger";
import { createUUID } from "./util";
import EventHelper from "./framework/EventHelper";
import UserManager from "oidc-client/src/UserManager";
import Log from "oidc-client/src/Log";
import params from "./params";
import { IBackend, ILogger, IAccountProxy, Response, ILoginModel, ILoginResult, ConnectionState, ResponsePromise, IShareProxy } from "carbon-api";
import { IEvent, IDisposable, LoginProvider } from "carbon-basics";
import { IApp } from "carbon-app";
import ActivityMonitor from "./ActivityMonitor";
import AutoSaveTimer from "./AutoSaveTimer";
import PersistentConnection from "./server/PersistentConnection";
import ConsistencyMonitor from "./ConsistencyMonitor";
import bluebird from "bluebird";

var debug = require<any>("DebugUtil")("carb:backend");

const enum contentTypes {
    json,
    urlEncoded
};

var defaultOptions = {
    useCache: false,
    showProgress: true,
    ignoreError: false,
    sendDefaultHeaders: true,
    contentType: contentTypes.json
};

class Backend implements IBackend {
    consistencyMonitor: ConsistencyMonitor;
    private _userManager: UserManager;
    private _connectionToken: IDisposable;
    private static _ready = false;

    autoSaveTimer: AutoSaveTimer;
    connection: PersistentConnection;
    activityMonitor: ActivityMonitor;
    logger: ILogger;

    fileEndpoint: any;
    cdnEndpoint: any;
    storageEndpoint: any;
    servicesEndpoint: any;

    sessionId: string;

    connectionStateChanged: IEvent<ConnectionState>;
    accessTokenChanged: IEvent<string>;
    loginNeeded: IEvent<boolean>;
    requestStarted: IEvent<string>;
    requestEnded: IEvent<string>;
    accountProxy: IAccountProxy;
    shareProxy: IShareProxy;

    LoginProvider: LoginProvider;

    constructor() {
        this.sessionId = createUUID();
        this.loginNeeded = EventHelper.createEvent();
        this.requestStarted = EventHelper.createEvent();
        this.requestEnded = EventHelper.createEvent();
        this.accessTokenChanged = EventHelper.createEvent();
        this.connectionStateChanged = EventHelper.createEvent<ConnectionState>();

        var endpoints = params.endpoints;
        this.servicesEndpoint = endpoints.services;
        this.storageEndpoint = endpoints.storage;
        this.cdnEndpoint = endpoints.cdn;
        this.fileEndpoint = endpoints.file;

        Log.logger = logger;
        Log.level = Log.ERROR;

        this._userManager = new UserManager({
            authority: this.servicesEndpoint + "/idsrv",
            client_id: "implicit",

            response_type: "token",
            scope: "account",

            silent_redirect_uri: window.location.protocol + "//" + window.location.host + "/a/renew",
            automaticSilentRenew: true,
            silentRequestTimeout: 30000,
            monitorSession: false,
            filterProtocolClaims: false,
            loadUserInfo: false
        });
        this._userManager.events.addUserLoaded(container => {
            if (container.access_token){
                this.setAccessToken(container.access_token);
            }
        });
        this._userManager.events.addSilentRenewError(e => {
            logger.error("Token renew error", e);
        });

        Logger.context.userId = this.getUserId();
        Logger.context.sessionId = this.sessionId;
    }

    raiseLoginNeeded() {
        this.loginNeeded.raise(this.isGuest());
    }

    setupConnection(app: IApp){
        if (this._connectionToken){
            this._connectionToken.dispose();
        }

        this.autoSaveTimer = new AutoSaveTimer(app, PersistentConnection.saveInterval);
        var persistentConnection = new PersistentConnection(app, this);
        this.activityMonitor = new ActivityMonitor(app, persistentConnection, this.autoSaveTimer);
        this.activityMonitor.activate();
        this.connection = persistentConnection;
        this._connectionToken = this.connection.stateChanged.bind(this, this.onConnectionStateChanged);

        this.consistencyMonitor = new ConsistencyMonitor(app);
        this.consistencyMonitor.start();

    }
    shutdownConnection(){
        if (this.autoSaveTimer){
            this.autoSaveTimer.stop();
            this.autoSaveTimer = null;
        }
        if (this.activityMonitor){
            this.activityMonitor.deactivate({type: "shuttingDown"});
            this.activityMonitor = null;
        }
        if (this.consistencyMonitor){
            this.consistencyMonitor.stop();
            this.autoSaveTimer = null;
        }
        if (this.connection){
            this.connection = null;
        }
        if (this._connectionToken){
            this._connectionToken.dispose();
            this._connectionToken = null;
        }
    }
    startConnection(){
        if (this.connection){
            this.connection.start();
        }
    }
    private onConnectionStateChanged(newState: ConnectionState){
        this.connectionStateChanged.raise(newState);
    }

    changeModel(app, primitives, returnModel): Promise<string> {
        if (!this.connection) {
            return Promise.reject(new Error("backend connection not initialized"));
        }
        return this.connection.getModelSyncHub().then(hub => {
            var primitiveStrings = primitives.map(x => JSON.stringify(x));
            return hub.invoke('changeModel', app.companyId(), app.folderId(), app.id(), primitiveStrings, returnModel);
        });
    }

    get(url, data?, options?) {
        options = Object.assign({}, defaultOptions, options);
        return this.ajax("get", url, data, options);
    }
    post(url, data, options?) {
        options = Object.assign({}, defaultOptions, options);
        return this.ajax("post", url, data, options);
    }
    ensureLoggedIn(renewToken = false): Promise<void> {
        if (this.isLoggedIn()) {
            if (renewToken) {
                return this.renewToken();
            }
            return Promise.resolve();
        }
        return this.loginAsGuest();
    }
    renewToken() {
        debug("Renew token, session %s", this.sessionId);
        return this._userManager.signinSilent()
            .catch(e => {
                this.raiseLoginNeeded();
                throw e;
            });
    }
    renewTokenCallback() {
        debug("Renew token callback, session %s", this.sessionId);
        this._userManager.signinSilentCallback();
    }
    isLoggedIn() {
        return !!this.getAccessToken() && !!this.getUserId();
    }
    loginAsGuest() {
        return this.login("trial", "trial", true);
    }
    loginAsUser(model: ILoginModel) {
        return this.login(model.email, model.password, false);
    }
    login(username, password, isGuest) {
        var data = {
            client_id: "auth",
            grant_type: "password",
            scope: "account",
            username: username,
            password: password
        };
        var options = {
            headers: {
                Authorization: "Basic " + btoa("auth:nopassword")
            },
            sendDefaultHeaders: false,
            contentType: contentTypes.urlEncoded
        };
        return this.post(this.servicesEndpoint + "/idsrv/connect/token", data, options)
            .then(data => this.setAccessToken(data.access_token))
            .then(() => this.postAuthenticate(isGuest))
            .catch(e => {
                if (e.response && e.response.status === 400) {
                    return e.response.json()
                        .then(json => {
                            var isEmailError = json.error_description === "@wrongEmail" || json.error_description === "@lockedOut";
                            return <Response<ILoginModel, ILoginResult>>{
                                ok: false,
                                errors: {
                                    email: isEmailError ? json.error_description : null,
                                    password: !isEmailError ? json.error_description : null
                                }
                            };
                        });
                }
                throw e;
            });
    }
    loginExternal(provider: LoginProvider){
        var acr = "idp:" + provider;
        var userId = this.getUserId();
        if (userId){
            acr += " tenant:" + this.getUserId();
        }

        var url = this.servicesEndpoint + "/idsrv/connect/authorize?" + this.encodeUriData({
            client_id: "implicit",
            redirect_uri: window.location.protocol + "//" + window.location.host + "/a/external",
            response_type: "token",
            response_mode: "fragment",
            scope: "account",
            acr_values: acr,
            state: createUUID(),
            nonce: createUUID()
        });
        location.href = url;
    }
    externalCallback(){
        var data = this.decodeUriData(location.hash.substr(1));
        if (data.access_token){
            this.setAccessToken(data.access_token);
            return this.postAuthenticate(false);
        }
        logger.fatal("No access token in " + location.hash);
        return Promise.reject(new Error("noAccessToken"));
    }
    private postAuthenticate(isGuest: boolean): ResponsePromise<ILoginModel, ILoginResult>{
        return this.get(this.servicesEndpoint + "/idsrv/ext/userId", null,
                { credentials: DEBUG ? "include" : "same-origin" })
            .then(data => {
                this.setUserId(data.userId);
                this.setIsGuest(isGuest);
                return <Response<ILoginModel, ILoginResult>>{
                    ok: true,
                    result: {
                        userId: data.userId,
                        companyName: data.companyName
                    }
                };
            });
    }

    logout() {
        return this.post(this.servicesEndpoint + "/idsrv/ext/logout", null, { credentials: DEBUG ? "include" : "same-origin" })
            .then(() => {
                localStorage.removeItem("accessToken");
                localStorage.removeItem("userId");
                localStorage.removeItem("isGuest");
            });
    }
    getAccessToken() {
        return localStorage.getItem("accessToken");
    }
    getUserId() {
        return localStorage.getItem("userId");
    }
    isGuest() {
        return localStorage.getItem("isGuest") === "1";
    }
    getAuthorizationHeaders() {
        var token = this.getAccessToken();
        if (token) {
            return { Authorization: "Bearer " + token };
        }
        return null;
    }
    enableLoginTimer() {
        sessionStorage.removeItem("forceRedirect");
        if (!this.isLoggedIn()) {
            return;
        }
        var check = () => {
            if (!this.isLoggedIn()) {
                this.raiseLoginNeeded();
            }
            else {
                setTimeout(check, 60 * 1000);
            }
        };
        setTimeout(check, 60 * 1000);
    }
    setAccessToken(accessToken) {
        localStorage.setItem("accessToken", accessToken);
        this.accessTokenChanged.raise(accessToken);
        debug("Access token changed, session %s", this.sessionId);
    }
    setUserId(userId) {
        localStorage.setItem("userId", userId);
    }
    setIsGuest(value) {
        localStorage.setItem("isGuest", value ? "1" : "0");
    }
    decorateUrl(url) {
        var accessToken = this.getAccessToken();
        if (accessToken) {
            var delimiter = url.indexOf("?") === -1 ? "?" : "&";
            return url + delimiter + "access_token=" + accessToken;
        }
        return url;
    }
    addUrlPath(url, path) {
        if (url[url.length - 1] !== "/") {
            url += "/";
        }
        if (path[0] === "/") {
            path = path.substring(1);
        }
        return url + path;
    }
    encodeUriData(data) {
        var s = "";
        for (var key in data) {
            if (s.length) {
                s += "&";
            }
            s += encodeURIComponent(key) + "=" + encodeURIComponent(data[key]);
        }
        return s;
    }
    decodeUriData(uri) {
        var result: any = {};
        var split = uri.split("&");
        for (var i = 0; i < split.length; ++i){
            var parts = split[i].split("=");
            if (parts.length > 0){
                result[decodeURIComponent(parts[0])] = parts[1] ? decodeURIComponent(parts[1]) : true;
            }
        }
        return result;
    }
    navigate(fragment) {
        window.location.href = fragment;
    }

    private ajax(method, url: string, data: any, options): any {
        this.requestStarted.raise(url);

        var fetchOptions: any = { method: method, headers: {}, mode: 'cors' };
        if (options && options.credentials) {
            fetchOptions.credentials = options.credentials;
        }
        if (data) {
            if (method === "get") {
                url += "?" + this.encodeUriData(data);
            }
            else {
                //our web api
                if (options.contentType === contentTypes.json) {
                    var split = this.splitData(data);
                    if (split[0]) {
                        url += "?" + this.encodeUriData(split[0]);
                    }
                    if (split[1]) {
                        fetchOptions.body = JSON.stringify(split[1]);
                    }
                }
                //auth service, requires all data in body
                else {
                    fetchOptions.body = this.encodeUriData(data);
                }
            }
        }

        if (method === "post") {
            var contentType;
            if (options.contentType === contentTypes.json) {
                contentType = "application/json";
            }
            else {
                contentType = "application/x-www-form-urlencoded";
            }
            fetchOptions.headers["Content-Type"] = contentType;
        }

        if (options.sendDefaultHeaders) {
            this.setHeaders(fetchOptions);
        }

        if (options.headers) {
            for (var header in options.headers) {
                fetchOptions.headers[header] = options.headers[header];
            }
        }

        var fetchPromise = fetch(url, fetchOptions)
            .then(response => this.checkStatus(response, url, fetchOptions, options))
            .then(response => {
                this.requestEnded.raise(url);
                return response;
            })
            .then(this.parseJSON)
            .catch(e => {
                logger.error("Request error", e);
                if (e.response && e.response.status === 401) {
                    this.raiseLoginNeeded();
                }
                else {
                    //TODO: show connection error notification
                }
                throw e;
            });

        return bluebird.resolve(fetchPromise);
    }

    private setHeaders(fetchOptions) {
        var authHeaders = this.getAuthorizationHeaders();
        if (authHeaders) {
            for (var header in authHeaders) {
                fetchOptions.headers[header] = authHeaders[header];
            }
        }

        if (this.sessionId) {
            fetchOptions.headers["X-SessionId"] = this.sessionId;
        }
    }

    //for web api simple types go to url, complex - to body
    private splitData(data) {
        var uri = null;
        var body = null;
        for (var key in data) {
            var value = data[key];
            if (value === null || value === undefined || typeof value !== "object") {
                uri = uri || {};
                uri[key] = value;
            }
            else {
                if (body) {
                    throw new Error("Only 1 body object is supported");
                }
                body = value;
            }
        }
        return [uri, body];
    }

    private checkStatus(response, url, fetchOptions, options) {
        if (response.status >= 200 && response.status < 300) {
            return response;
        }
        //server convention 422 - validation failed
        if (response.status === 422) {
            return response;
        }
        if (response.status === 401 && (!options || !options.isRetry)) {
            options = options || {};
            options.isRetry = true;
            return this.renewToken()
                .then(() => {
                    this.setHeaders(fetchOptions);
                    return fetch(url, fetchOptions);
                });
        }
        var error = new Error(response.statusText);
        error['response'] = response;
        throw error;
    }

    private parseJSON(response): any {
        return response.json();
    }

    private handleServerError(data) {
        var location = data.getResponseHeader("location");
        if (location) {
            this.navigate(location);
        }
        else {
            var message = data.getResponseHeader("errorMessage");
            if (message) {
                //this.notify("error", message);
            }
        }
    }
}

let backend: Backend = globals.backend;
if (!backend) {
    backend = new Backend();
    debug("created backend, session %s", backend.sessionId);
    globals.backend = backend;
}
export default backend;