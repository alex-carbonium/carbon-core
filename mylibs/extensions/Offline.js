import ExtensionBase from "./ExtensionBase";

function onStateChanged() {
    //this.app.isInOfflineMode(!App.Current.isOnline());
}

export default class OfflineWatcher extends ExtensionBase{
    constructor(app, view, controller){
        super(app, view, controller);
    }

    attach(app) {
        if (!app.platform.richUI()) {
            return;
        }

        app.addLoadRef();

        window.addEventListener('online', onStateChanged);
        window.addEventListener('offline', onStateChanged);

        app.releaseLoadRef();
    }
}
