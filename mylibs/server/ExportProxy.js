define(["./ControllerProxy"], function(ControllerProxy){
    return klass2("sketch.server.ExportProxy", ControllerProxy, (function () {
        return {
            _constructor: function() {
                this.baseUrl = sketch.params.exportServiceUrl;
            },
            upload: function (shareCode, fileModels) {
                return this.post("/html/htmlExport/upload", {shareCode: shareCode, fileModels: fileModels}, null, null, true);
            }

        }
    })());
});