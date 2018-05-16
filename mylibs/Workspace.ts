import EventHelper from "./framework/EventHelper";
import { IView, IController, IWorkspace, IEvent2 } from "carbon-core";
import ShortcutManager from "./ui/ShortcutManager";
import { keyboard } from "./platform/Keyboard";
import UserSettings from "./UserSettings";
import logger from "./logger";

class Workspace implements IWorkspace {
    shortcutManager = new ShortcutManager();
    keyboard = keyboard;
    settings = UserSettings;
    fatalErrorOccurred = EventHelper.createEvent<void>();
    public richUI = false;

    loaded: Promise<void>;
    resolveLoaded: () => void;

    constructor() {
        this.loaded = new Promise<void>(resolve => this.resolveLoaded = resolve);
    }

    reportFatalErrorAndRethrow(e: Error) {
        logger.fatal("fatality", e);
        logger.trackMetric("fatality", 1);
        logger.flush();
        this.fatalErrorOccurred.raise();

        let newError = new Error("carbon-handled");
        newError['innerError'] = e;
        throw newError;
    }
}

export default new Workspace();