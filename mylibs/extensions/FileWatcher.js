define(function (fwk) {
    return klass((function () {
        function checkChangedFiles(){
            var proxy = new sketch.server.ControllerProxy();
            proxy.post("/Developer/GetChangedFiles", '', function(data){
                if(data.length){
                    each(data, function(file){
                        var headID = document.getElementsByTagName("head")[0];
                        var newScript = document.createElement('script');
                        newScript.type = 'text/javascript';
                        newScript.src = file;
                        headID.appendChild(newScript);
                    });

                    alert(data);
                }
                setTimeout(checkChangedFiles, 3000);
            }, function(data){
                setTimeout(checkChangedFiles, 5000);
            });
        }

        function initFileWatcher() {
            var proxy = new sketch.server.ControllerProxy();
            proxy.post("/Developer/ResetFileWatcher", '', function(){
                setTimeout(checkChangedFiles, 3000);
            }, function(data){
                alert(data);
            });
        }


        return {
            _constructor:function (app) {
//                app.loaded.bind(function(){
//                    initFileWatcher();
//                });
            }
        }
    })());
});