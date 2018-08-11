import ExtensionBase from "./ExtensionBase";
import RelayoutQueue from "../framework/relayout/RelayoutQueue";
import CommandManager from "../framework/commands/CommandManager";
import { IApp } from "carbon-core";

export default class AutoSave extends ExtensionBase {
    private static checked: boolean = false;

    constructor(app: IApp) {
        super(app);
        this.app.onLoad(this.checkBackups);
    }

    private restoreUnsaved(backup) {
        var app = this.app;
        app.beginUpdate();

        app.state.setExternalChange(true);

        if (!backup.appVersion) {
            app.clear();
        }

        app.modelSyncProxy.addPendingChanges(backup.changes);
        RelayoutQueue.enqueueAll(backup.changes);
        app.relayout();
        if (app.pages.length) {
            app.setActivePage(app.pages[0]);
        }

        app.state.setExternalChange(false);
        app.relayout();
        app.endUpdate();
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

        this.clearAutosavedVersion(this.app.id);
    }

    private clearAutosavedVersion(id) {
        this.app.offlineModel.clearSyncLogForProject(id);
    }

    private initIfEmptyProject() {
        if (this.app.isEmpty()) {
            this.app.addNewPage();
            this.app.state.isDirty(false);
        }

        if (!this.app.activePage) {
            var page = this.app.pages[0];
            this.app.setActivePage(page);
        }

        this.app.relayout();
        CommandManager.clear();
    }

    private checkBackups = () => {
        if (AutoSave.checked) {
            return Promise.resolve();
        }

        AutoSave.checked = true;

        if (!this.app.id) {
            this.initIfEmptyProject();
            return Promise.resolve();
        }

        return this.app.offlineModel.getBackups(this.app.id).then(backups => {
            if (!backups.length || this.app.disposed) {
                return;
            }

            if (this.app.serverless()) {
                this.restoreUnsaved(backups[backups.length - 1]);
                this.app.actionManager.invoke("restoreWorkspaceState");
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
            if (!this.app.disposed) {
                this.initIfEmptyProject();
            }
        });
    };

    detach() {
    }
}