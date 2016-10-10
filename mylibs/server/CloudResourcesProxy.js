define(["./ControllerProxy"], function(ControllerProxy){
    return klass2("sketch.server.CloudResourcesProxy", ControllerProxy, (function () {
        return {
            _constructor:function () {
                this.baseUrl = sketch.params.exportServiceUrl;
            },
            publishPageTemplate:function(projectType, pageName, pageData, imageData){
                this.post("/Resources/Public/AddPageTemplate", {
                    projectType:projectType,
                    name:pageName,
                    pageData:pageData,
                    imageData:imageData
                }, function(){
                    notify("info", {title: "Page template saved", text: name});
                });
            },
            getAllPages:function(projectType, success){
                this.post("/Resources/Public/GetAllPages",{
                        projectType:projectType
                    },
                    success
                );
            },
            getPageData:function(projectType, key, success){
                this.post("/Resources/Public/GetPageData",{
                        projectType:projectType,
                        key:key
                    },
                    success);
            }
        }
    })());
});