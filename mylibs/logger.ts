import {appInsights, appInsightsEnabled} from "./appInsights";
import { ILogger } from "carbon-api";

var tracingEnabled = !!localStorage.getItem("trace");

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
            appInsights.trackTrace(message, context);
            break;
        case "warn":
            method = "warn";
            appInsights.trackTrace(message, context);
            break;
        case "error":
            method = "error";
            appInsights.trackException(messageOrException, null, context);
            break;
        case "fatal":
            method = "error";
            appInsights.trackException(messageOrException, null, context);
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
        appInsights.trackEvent(name, properties, metrics);
    }
    trackMetric(name, value){
        appInsights.trackMetric(name, value);
    }
    trackPageView() {
        appInsights.trackPageView();
    }
    flush() {
        appInsights.flush();
    }
}

export default new Logger();