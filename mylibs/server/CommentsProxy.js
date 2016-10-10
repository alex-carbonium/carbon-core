define(["./ControllerProxy"], function (ControllerProxy) {
    return klass2("sketch.server.CommentsProxy", ControllerProxy, (function () {
        function onBeforeSend(req){
            req.data.projectId = App.Current.id();
        }

        return {
            getAll:function(sucess){
                this.ensureSavedAndPost('/api/Comments/GetAll', {}, sucess, onBeforeSend);
            }
        }
    })());
});