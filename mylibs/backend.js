import {createUUID} from "./util";
import EventHelper from "./framework/EventHelper";
import Promise from "bluebird";
import UserManager from "oidc-client/src/UserManager";
import Log from "oidc-client/src/Log";
import globals from "./globals";

var debug = require("DebugUtil")("carb:backend");

var instanceId = 0;

var contentTypes = {
    json: 0,
    urlEncoded: 1
};

var defaultOptions = {
    useCache: false,
    showProgress: true,
    useTimestamp: true, //ajax get requests without parameters are randomly failing in chrome
    ignoreError: false,
    sendDefaultHeaders: true,
    contentType: contentTypes.json
};

var globalOptions = {
    requestStarted: function(){
    },
    requestEnded: function(){
    }
};

var backend = globals.backend || {
    _globalOptions: globalOptions,
    sessionId: createUUID(),
    loginNeeded: EventHelper.createEvent(),
    accessTokenChanged: EventHelper.createEvent(),
    raiseLoginNeeded: function(){
        this.loginNeeded.raise(this.isGuest());
    },
    init: function(logger, endpoints){
        if (this._ready){
            return;
        }

        this._instanceId = ++instanceId;
        debug("Initialize [%s]", this._instanceId);

        this.servicesEndpoint = endpoints.services;
        this.storageEndpoint = endpoints.storage;
        this.cdnEndpoint = endpoints.cdn;
        this.fileEndpoint = endpoints.file;

        this._globalOptions = Object.assign({}, globalOptions);
        this.logger = logger;

        Log.logger = logger;
        Log.level = Log.ERROR;

        this._userManager = new UserManager({
            authority: this.servicesEndpoint + "/idsrv",
            client_id: "renew",

            response_type: "token",
            scope: "account",

            silent_redirect_uri: window.location.protocol + "//" + window.location.host + "/a/renew",
            automaticSilentRenew: true,
            silentRequestTimeout: 30000,
            monitorSession: false,
            filterProtocolClaims: false,
            loadUserInfo: false
        });
        this._userManager.events.addSilentRenewError(e => {
            logger.error("Token renew error", e);
        });
        this._ready = true;
    },
    initOptions: function(options){
        this._globalOptions = Object.assign({}, this._globalOptions, options);
    },
    setConnection: function(connection){        
        this._connection = connection;
    },
    changeModel: function(app, primitives, returnModel){
        if (!this._connection){
            return Promise.reject(new Error("backend connection not initialized"));
        }
        return this._connection.getModelSyncHub().then(function(hub){
            var primitiveStrings = primitives.map(x => JSON.stringify(x));
            return hub.invoke('changeModel', app.companyId(), app.folderId(), app.id(), primitiveStrings, returnModel);
        });
    },
    get: function(url, data, options){
        options = Object.assign({}, defaultOptions, options);
        return ajax.call(this, "get", url, data, options);
    },
    post: function(url, data, options){
        options = Object.assign({}, defaultOptions, options);
        return ajax.call(this, "post", url, data, options);
    },
    ensureLoggedIn(renewToken = true){
        if (this.isLoggedIn()){
            if (renewToken){
                return this.renewToken();
            }
            return Promise.resolve();
        }
        return this.loginAsGuest();
    },
    renewToken(){
        debug("Renew token [%s]", this._instanceId);
        return this._userManager.signinSilent()
            .then(data => this.setAccessToken(data.access_token))
            .catch(e => {
                backend.raiseLoginNeeded();
                throw e;
            });
    },
    renewTokenCallback(){
        debug("Renew token callback [%s]", this._instanceId);
        this._userManager.signinSilentCallback();
    },
    isLoggedIn: function(){
        return this.getAccessToken() && this.getUserId();
    },
    loginAsGuest: function(){
        return this.login("trial", "trial", true);
    },
    loginAsUser: function(username, password){
        return this.login(username, password, false);
    },
    login: function(username, password, isGuest){
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
            .then(() => this.get(this.servicesEndpoint + "/idsrv/ext/userId", null,
                {credentials: DEBUG ? "include" : "same-origin"}))
            .then(data => {this.setUserId(data.userId); return data;})
            .then(data => {this.setIsGuest(isGuest); return data;});
    },
    logout: function(){
        return this.post(this.servicesEndpoint + "/idsrv/ext/logout", null, {credentials: DEBUG ? "include" : "same-origin"})
            .then(() => {
                localStorage.removeItem("accessToken");
                localStorage.removeItem("userId");
                localStorage.removeItem("isGuest");
            });
    },
    getAccessToken: function(){
        return localStorage.getItem("accessToken");
    },
    getUserId: function(){
        return localStorage.getItem("userId");
    },
    getSessionId: function() {
        return ''; // TODO: implement session
    },
    isGuest: function(){
        return localStorage.getItem("isGuest") === "1";
    },
    getAuthorizationHeaders: function(){
        var token = this.getAccessToken();
        if (token){
            return {Authorization: "Bearer " + token};
        }
        return null;
    },
    enableLoginTimer: function(){
        sessionStorage.removeItem("forceRedirect");
        if (!this.isLoggedIn()){
            return;
        }
        var check = () => {
            if (!this.isLoggedIn()){
                this.raiseLoginNeeded();
            }
            else{
                setTimeout(check, 60 * 1000);
            }
        };
        setTimeout(check, 60 * 1000);
    },
    setAccessToken: function(accessToken){
        localStorage.setItem("accessToken", accessToken);
        this.accessTokenChanged.raise(accessToken);
    },
    setUserId: function(userId){
        localStorage.setItem("userId", userId);
    },
    setIsGuest: function(value){
        localStorage.setItem("isGuest", value ? "1" : "0");
    },
    decorateUrl: function(url){
        var accessToken = this.getAccessToken();
        if (accessToken){
            var delimiter = url.indexOf("?") === -1 ? "?" : "&";
            return url + delimiter + "access_token=" + accessToken;
        }
        return url;
    },
    addUrlPath: function(url, path){
        if (url[url.length - 1] !== "/"){
            url += "/";
        }
        if (path[0] === "/"){
            path = path.substring(1);
        }
        return url + path;
    },
    encodeUriData: function(data){
        var s = "";
        for (var key in data){
            if (s.length){
                s += "&";
            }
            s += encodeURIComponent(key) + "=" + encodeURIComponent(data[key]);
        }
        return s;
    },
    notify: function(type, message){
        console.log(type + ": " + message);
    },
    navigate: function(fragment){
        window.location.href = fragment;
    }
};

function ajax(method, url, data, options){
    this._globalOptions.requestStarted(url, data, options);

    var fetchOptions = {method: method, headers: {}, mode: 'cors'};
    if (options && options.credentials){
        fetchOptions.credentials = options.credentials;
    }
    if (data){
        if (method === "get"){
            url += "?" + backend.encodeUriData(data);
        }
        else{
            //our web api
            if (options.contentType === contentTypes.json){
                var split = splitData(data);
                if (split[0]){
                    url += "?" + backend.encodeUriData(split[0]);
                }
                if (split[1]){
                    fetchOptions.body = JSON.stringify(split[1]);
                }
            }
            //auth service, requires all data in body
            else{
                fetchOptions.body = backend.encodeUriData(data);
            }
        }
    }

    if (method === "post"){
        var contentType;
        if (options.contentType === contentTypes.json){
            contentType = "application/json";
        }
        else{
            contentType = "application/x-www-form-urlencoded";
        }
        fetchOptions.headers["Content-Type"] = contentType;
    }

    if (options.sendDefaultHeaders){
        setHeaders.call(this, fetchOptions);
    }

    if (options.headers){
        for (var header in options.headers){
            fetchOptions.headers[header] = options.headers[header];
        }
    }

    return fetch(url, fetchOptions)
        .then(response => checkStatus.call(this, response, url, fetchOptions, options))
        .then(response =>{
            this._globalOptions.requestEnded(url, data, options);
            return response;
        })
        .then(parseJSON)
        .catch(e => {
            backend.logger.error("Request error", e);
            if (e.response && e.response.status === 401){
                this.raiseLoginNeeded();
            }
            else{
                //TODO: show connection error notification
            }
            throw e;
        });
}

function setHeaders(fetchOptions){
    var authHeaders = this.getAuthorizationHeaders();
    if (authHeaders){
        for (var header in authHeaders){
            fetchOptions.headers[header] = authHeaders[header];
        }
    }

    if (this.sessionId){
        fetchOptions.headers["X-SessionId"] = this.sessionId;
    }
}

//for web api simple types go to url, complex - to body
function splitData(data){
    var uri = null;
    var body = null;
    for (var key in data){
        var value = data[key];
        if (value === null || value === undefined || typeof value !== "object"){
            uri = uri || {};
            uri[key] = value;
        }
        else {
            if (body){
                throw new Error("Only 1 body object is supported");
            }
            body = value;
        }
    }
    return [uri, body];
}

function checkStatus(response, url, fetchOptions, options){
    if (response.status >= 200 && response.status < 300){
        return response;
    }
    if (response.status === 401 && (!options || !options.isRetry)){
        options = options || {};
        options.isRetry = true;
        return backend.renewToken()
            .then(() => {
                setHeaders.call(this, fetchOptions);
                return fetch(url, fetchOptions);
            });
    }
    var error = new Error(response.statusText);
    error.response = response;
    throw error;
}

function parseJSON(response){
    return response.json();
}

function handleServerError(data){
    var location = data.getResponseHeader("location");
    if (location){
        backend.navigate(location);
    }
    else{
        var message = data.getResponseHeader("errorMessage");
        if (message){
            backend.notify("error", message);
        }
    }
}

globals.backend = backend;
export default backend;