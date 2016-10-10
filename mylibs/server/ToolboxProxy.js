define(["./ControllerProxy"], function(ControllerProxy){
    return klass(ControllerProxy, {
        _constructor: function() {
            this.baseUrl = sketch.params.exportServiceUrl;
        },
        getMetadata: function (includeProject) {
            var data = includeProject ? {includeProject: includeProject} : null;
            return this.get("/api/toolbox/metadata", data);
        },
        getElements: function(project){
            return this.get("/api/toolbox/elements", {project: project});
        }
    });
});