import logger from "./logger";
import backend from "./backend";
import { IApp } from "carbon-core";

const CHECK_INTERVAL = 10 * 1000;
const REPORT_INTERVAL = 6 * 60 * 1000;

export default class ConsistencyMonitor {
    private _timeout: number;
    lastReportTime: number;

    constructor(private app: IApp) {
        this.lastReportTime = 0;
        this._timeout = 0;
    }

    start() {
        this.scheduleCheck(this.app);
    }
    stop() {
        if (this._timeout){
            clearTimeout(this._timeout);
            this._timeout = 0;
        }
    }

    private scheduleCheck(app) {
        this._timeout = setTimeout(() => {
            try {
                this.check(app);
            }
            catch (e) {
                logger.fatal("Consistency check failed", e);
            }
            this.scheduleCheck(app);
        }, CHECK_INTERVAL);
    }

    private check(app) {
        this.report(app);
    }

    private report(app: IApp) {
        var now = new Date().getTime();
        if (!this.lastReportTime) {
            this.lastReportTime = now;
        }
        if (now - this.lastReportTime > REPORT_INTERVAL) {
            var report: any = {};
            if (app.state) {
                report.dirty = app.isDirty();
            }
            if (backend.activityMonitor) {
                report.activityMonitorState = backend.activityMonitor.state;
            }
            if (backend.connection) {
                report.persistentConnectionState = backend.connection.state;
            }
            if (backend.autoSaveTimer) {
                report.autoSaveTimer = {
                    state: backend.autoSaveTimer.state,
                    lastTickTime: backend.autoSaveTimer.lastTickTime,
                    saveInProgress: backend.autoSaveTimer.saveInProgress
                };
            }
            logger.info("Consistency report.", report);

            if (report.activityMonitorState === "active") {
                logger.trackEvent("ActiveProject");
            }

            this.lastReportTime = now;
        }
    }
}
