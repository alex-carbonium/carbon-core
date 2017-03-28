import DeferredPrimitives from "../framework/sync/DeferredPrimitives";

define(["windows/Dialog", "framework/sync/Primitive"], function(Dialog, Primitive) {
    var fwk = sketch.framework;



    return klass((function() {



        var restoreUnsaved = function(backup){
            var app = this._app;
            app.state.setExternalChange(true);

            if (!backup.appVersion){
                app.clear();
            }

            for (var i = 0; i < backup.changes.length; i++){
                DeferredPrimitives.register(backup.changes[i]);
            }
            app.modelSyncProxy.addPendingChanges(backup.changes);
            app.relayout();
            if (app.pages.length){
                app.setActivePage(app.pages[0]);
            }

            app.state.setExternalChange(false);
            app.relayout();
            app.restoredLocally.raise();
        };

        var loadLocalChanges = function(viewModel, primitives) {

            restoreUnsaved.call(this, primitives);

            viewModel.loadLocalChanges.clearSubscribers();
            viewModel.loadLastSavedVersion.clearSubscribers();
        };

        var loadLastSavedVersion = function(viewModel) {
            //just continue, the latest version is being opened...

            viewModel.loadLocalChanges.clearSubscribers();
            viewModel.loadLastSavedVersion.clearSubscribers();

            clearAutosavedVersion.call(this, this._app.id() || this._app.projectType());
        };

        var clearAutosavedVersion = function(id){
            this._app.offlineModel.clearSyncLogForProject(id);
        };

        function initIfEmptyProject() {
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

        var checkBackups = function() {
            if (!this._app.id()){
                initIfEmptyProject.call(this);
                return Promise.resolve();
            }

            return this._app.offlineModel.getBackups(this._app.id()).then(backups => {
                if (!backups.length) {
                    return;
                }

                if (this._app.serverless()) {
                    restoreUnsaved.call(this, backups[backups.length - 1]);
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
                initIfEmptyProject.call(this);
            });
        };

        return {
            _constructor:function(app) {
                this._app = app;

                this._app.loadedLevel1.then(checkBackups.bind(this));
            },
            restoreUnsaved: function() {
                restoreUnsaved.call(this);
            },
            detach:function(){
            }
        };
    })());
});