define(["projects/Project"], function(Project){
    var fwk = sketch.framework;
    var ui = sketch.ui;

    return klass2("sketch.projects.AndroidProject", Project, (function(){

        return {
            _constructor:function(){
                this.defaultScreenType = 'Android';
            },
            load: function(app, deferred){
                fwk.Font.setDefaults({
                    family: fwk.FontInfo.defaultNapkinFont,
                    size: 31,
                    weight: "300"
                });

                if (!this._projectSetup){
                    this.setupThemes();
                    this._projectSetup = true;
                }
                ui.IconsInfo.defaultFontFamily = 'NinjamockAndroid';
                this.loadStrings();
                deferred.resolve();
            }
        }
    })());
});