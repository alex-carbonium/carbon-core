define("bootloader", ["App", "framework/Resources"], function(App){
    var fwk = sketch.framework;

    if(!sketch.params) {
        sketch.params = JSON.parse(sessionStorage.getItem('params'));
    }

    App.Current = new App();
    App.Current.theme(sketch.params.theme);
    App.Current.id(sketch.params.appId);
    App.Current.initFromJsonParameters(sketch.params);

    App.Current.run();
});