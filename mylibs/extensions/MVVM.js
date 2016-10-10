define(["ui/properties/TemplatePropertyDesigner",  "viewmodels/AppViewModel"],
    function(TemplatePropertyDesigner, AppViewModel){
        return klass({
            _constructor: function(app){
                //viewmodel is needed for sharing on mobile
                app.viewModel = new AppViewModel(app);

                if (!app.platform.richUI()){
                    return;
                }

                app.addLoadRef();

                //app.actionsViewModel = new ActionsViewModel(app.actionManager);
                //app.actionsViewModel.updateActions(app.getDefaultCategories());
                //app.viewModel.actionsViewModel = app.actionsViewModel;
                //app.templatePropertyDesigner = new TemplatePropertyDesigner("#templatePropertyDesigner", app);

                app.releaseLoadRef();

            }
        });
    }
);
