define(["./ControllerProxy"], function(ControllerProxy){
    return klass2("sketch.server.DeveloperProxy", ControllerProxy, (function(){
        return {
            saveControlTemplate: function(name, data){
                this.post("/api/Developer/SaveControlTemplate", { name: name, data: data }, function(){
                    notify("info", {title: "Template saved", text: name});
                }, function(error){
                    notify("error", {title: "Ooops, something happened :(", text: error});
                });
            }
        }
    })());
});