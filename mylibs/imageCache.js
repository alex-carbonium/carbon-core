define(["offline/IndexedDB", "framework/Deferred"], function(IndexedDB, Deferred){
    var db;

    function ensureOpened(){
        if (!db){
            db = IndexedDB.open("imageCache", 1, {
                "template": {keyPath: "id"},
                "page": {
                    keyPath: "id",
                    indexes: {"projectId": {key: "projectId", unique: false}}
                }
            })
        }
    }

    return {
        getOrPutTemplate: function(templateId, cb){
            ensureOpened();

            var dfd = Deferred.create();
            db.findOneById("template", templateId)
                .then(function(cached){
                    dfd.resolve(cached.imageData);
                })
                .fail(function(){
                    var imageData = cb();
                    db.put("template", {id: templateId, imageData: imageData})
                        .then(function(){
                            dfd.resolve(imageData);
                        })
                        .fail(dfd.reject);
                });

            return dfd.promise();
        },
        getOrPutPage: function(projectId, pageId, version, cb){

            return  Deferred.create().resolve("");
            //
            // ensureOpened();
            // var dfd = Deferred.create();
            //
            // function putData() {
            //     var imageData = cb();
            //     db.put("page", {id: pageId, projectId:projectId, version:version, imageData: imageData})
            //         .then(function(){
            //             dfd.resolve(imageData);
            //         })
            //         .fail(dfd.reject);
            // }
            //
            // db.findOneById("page", pageId)
            //     .then(function(cached){
            //         if(cached.version === version) {
            //             dfd.resolve(cached.imageData);
            //         } else {
            //             putData();
            //         }
            //     })
            //     .fail(function(){
            //         putData();
            //     });
            //
            // return dfd.promise();
        }
    };
});