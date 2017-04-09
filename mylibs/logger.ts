import appInsights from "./appInsights";
import { ILogger } from "carbon-api";

var appInsightsEnabled = !!appInsights;
var tracingEnabled = !!localStorage.getItem("trace");

function ErrorCounter(){
    var self = this;
    self._start = new Date();
    self._sameMesssages = 0;
    self._lastMessage = "";

    self.update = function(message){
        if (message !== self._lastMessage){
            self._start = new Date();
            self._sameMesssages = 0;
        }
        self._lastMessage = message;
        ++self._sameMesssages;
    };
    self.isSameErrorRepeating = function(){
        if (self._sameMesssages < 10){
            return false;
        }
        var now = new Date();
        return now.getTime() - this._start.getTime() < 3000;
    }
}
var errorCounter = new ErrorCounter();

function log(type, message, args){
    if (appInsightsEnabled && appInsights.context && !appInsights.context.user.authenticatedId){
        var userId = Logger.context.userId;
        if (userId){
            appInsights.setAuthenticatedUserContext(userId);
        }
    }

    var messageOrException;
    var context;
    if (args){
        if (args instanceof Error){
            messageOrException = args;
            context = {message: message};
        }
        else{
            messageOrException = message;
            context = {};
            if (args){
                for (var i in args){
                    context[i] = args[i];
                }
            }
        }
    }
    else{
        messageOrException = message;
        context = {};
    }
    context.logLevel = type;
    setContext(context);

    stringifyComplexProperties(context);

    var method = null;
    switch (type){
        case "trace":
            method = "log";
            break;
        case "info":
            method = "info";
            appInsightsEnabled && appInsights.trackTrace(message, context);
            break;
        case "warn":
            method = "warn";
            appInsightsEnabled && appInsights.trackTrace(message, context);
            break;
        case "error":
            method = "error";
            errorCounter.update(message);
            appInsightsEnabled && appInsights.trackException(messageOrException, null, context);
            break;
        case "fatal":
            method = "error";
            errorCounter.update(message);
            appInsightsEnabled && appInsights.trackException(messageOrException, null, context);
            break;
    }
    if (tracingEnabled && method){
        if (args){
            console[method](message, args);
        }
        else{
            console[method](message);
        }
    }
    if (errorCounter.isSameErrorRepeating()){
        console.log("//TODO: add handling of repeating error");
    }
}

function setContext(context){
    context.sessionId = Logger.context.sessionId;
}

function stringifyComplexProperties(data){
    for (var i in data){
        var value = data[i];
        if (value && (Array.isArray(value) || Object(value) === value)){
            data[i] = JSON.stringify(value);
        }
    }
}

export class Logger implements ILogger {
    static context: any = {};

    trace(msg, args?){
        log("trace", msg, args);
    }
    info(msg, args?){
        log("info", msg, args);
    }
    warn(msg, args?){
        log("warn", msg, args);
    }
    error(msg, args?){
        log("error", msg, args);
    }
    fatal(msg, args?){
        log("fatal", msg, args);
    }
    trackEvent(name, properties?, metrics?: any){
        if (properties && properties.logLevel){
            log(properties.logLevel, name, properties);
        }
        appInsightsEnabled && appInsights.trackEvent(name, properties, metrics);
    }
    trackMetric(name, value){
        appInsightsEnabled && appInsights.trackeMetric(name, value);
    }
}

export default new Logger();