define(["./app", "framework/Deferred"], function (App, deferred){
    return klass(App, {
        _constructor: function(){
            App.Current = this;
        },
        run: function(){
            var dfd = deferred.create();

            this.platform.createCanvas(1024, 768);
            this._contextExtensionsReady
                .then(function(context){
                    //this.view = this.platform.createView();

                    this.loadMainProject()
                        .then(function(){
                            dfd.resolve(context);
                        });
                }.bind(this));

            return dfd.promise();
        }
    });
});