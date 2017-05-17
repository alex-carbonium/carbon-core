import DeferredPrimitives from "../framework/sync/DeferredPrimitives";
import ExtensionBase from "./ExtensionBase";

export default class AutoSave extends ExtensionBase {
    constructor(app, view, controller) {
        super(app, view, controller);
        this._app = app;
        this._app.onLoad(this.checkBackups);
    }

    private restoreUnsaved(backup) {
        var app = this._app;
        app.state.setExternalChange(true);

        if (!backup.appVersion) {
            app.clear();
        }

        for (var i = 0; i < backup.changes.length; i++) {
            DeferredPrimitives.register(backup.changes[i]);
        }
        app.modelSyncProxy.addPendingChanges(backup.changes);
        app.relayout();
        if (app.pages.length) {
            app.setActivePage(app.pages[0]);
        }

        app.state.setExternalChange(false);
        app.relayout();
        app.restoredLocally.raise();
    }

    private loadLocalChanges(viewModel, primitives) {

        this.restoreUnsaved(primitives);

        viewModel.loadLocalChanges.clearSubscribers();
        viewModel.loadLastSavedVersion.clearSubscribers();
    }

    private loadLastSavedVersion(viewModel) {
        //just continue, the latest version is being opened...

        viewModel.loadLocalChanges.clearSubscribers();
        viewModel.loadLastSavedVersion.clearSubscribers();

        this.clearAutosavedVersion(this._app.id() || this._app.projectType());
    }

    private clearAutosavedVersion(id) {
        this._app.offlineModel.clearSyncLogForProject(id);
    }

    private initIfEmptyProject() {
        var that = this;
        if (this._app.isEmpty()) {
            that._app.name("My awesome app"); //initial name should be in sync with actor code
            that._app.addNewPage();
            that._app.state.isDirty(false);
        }

        if (!that._app.activePage) {
            var page = that._app.pages[0];
            that._app.setActivePage(page);
        }
    }

    private checkBackups = () => {
        if (!this._app.id()) {
            this.initIfEmptyProject();
            return Promise.resolve();
        }

        return this._app.offlineModel.getBackups(this._app.id()).then(backups => {
            if (!backups.length || this._app.disposed) {
                return;
            }

            if (this._app.serverless()) {
                this.restoreUnsaved(backups[backups.length - 1]);
                this._app.restoreWorkspaceState();
            }
            else {
                // var dialog = new Dialog(new LoadUnsavedChangesDialog(), {
                //     modal: true, width: 400, canClose: false
                // });
                //
                // dialog.viewModelPromise().then(function(viewModel){
                //     viewModel.loadLocalChanges.bind(that, function(){
                //         loadLocalChanges.call(this, viewModel, primitives)
                //     });
                //     viewModel.loadLastSavedVersion.bind(that, loadLastSavedVersion);
                //
                //     dialog.show();
                // });
            }
        }).finally(() => {
            if (!this._app.disposed) {
                this.initIfEmptyProject();
            }
        });
    };

    detach() {
    }
}