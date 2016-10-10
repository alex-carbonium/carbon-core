var CHECK_INTERVAL = 10 * 1000;
var REPORT_INTERVAL = 6 * 60 * 1000;

function scheduleCheck(app){
    setTimeout(function(){
        try{
            check(app);
        }
        catch (e){
            logger.fatal("Consistency check failed", e);
        }
        scheduleCheck(app);
    }, CHECK_INTERVAL);
}

function check(app){
    // if (app.pendingPrimitives.scheduled
    //     && new Date() - app.pendingPrimitives.scheduledTime > 10 * 1000){
    //     logger.warn("Pending primitives not cleared, forcing log event");
    //     app.pendingPrimitives.scheduled = false;
    //     app.logEvent.raise(app.pendingPrimitives);
    // }
    //
    // report(app);
}

var lastReportTime;

function report(app){
    var now = new Date();
    if (!lastReportTime){
        lastReportTime = now;
    }
    if (now - lastReportTime > REPORT_INTERVAL){
        var report = {
            pendingPrimitivesScheduledTime: app.pendingPrimitives.scheduledTime
        };
        if (app.state){
            report.dirty = app.state.isDirty();
        }
        if (app.activityMonitor){
            report.activityMonitorState = app.activityMonitor.state;
        }
        if (app.persistentConnection){
            report.persistentConnectionState = app.persistentConnection.state;
        }
        if (app.autoSaveTimer){
            report.autoSaveTimer = {
                state: app.autoSaveTimer.state,
                lastTickTime: app.autoSaveTimer.lastTickTime,
                saveInProgress: app.autoSaveTimer.saveInProgress
            };
        }
        logger.info("Consistency report.", report);

        if (report.activityMonitorState === "active"){
            logger.trackEvent("ActiveProject");
        }

        lastReportTime = now;
    }
}

var ConsistencyMonitor = function(app){
    this._app = app;
};

ConsistencyMonitor.prototype.start = function(){
    scheduleCheck(this._app);
};

export default ConsistencyMonitor;
