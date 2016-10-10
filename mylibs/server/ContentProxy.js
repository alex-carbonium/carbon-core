define(["./ControllerProxy"], function(ControllerProxy){
    return klass2("sketch.server.ContentProxy", ControllerProxy, (function () {
        return {
            uploadExportedImage: function(encodedImage) {
                return this.post("/api/File/UploadExportedImage", {folderId: sketch.params.folderId, encodedImage:encodedImage});
            },
            deleteImage: function(name) {
                return this.post("/api/File/Delete", {folderId: sketch.params.folderId, name: name});
            },
            getUserImages: function(){
                return this.post("/api/File/Images", {folderId: sketch.params.folderId});
            }

        }
    })());
});

