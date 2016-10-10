define(function() {
    return klass((function() {
        var splash;

        var loadRefChanged = function(event){
            if(event.newValue === 0){
                splash.hide();
            } else {
                splash.show();
            }
        };

        return {
            _constructor:function(app) {
                splash = $("#splash");

                this._app = app;
                app.properties.loadRef.bind(this, loadRefChanged);

                app.loaded.then(function(){
                    splash.css("top", $("#toolbar").outerHeight() + "px");
                });
            }
        };
    })());
});