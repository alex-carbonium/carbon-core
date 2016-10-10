Namespace("sketch.projects");

(function (fwk, ui) {

    klass2("sketch.projects.iOSProject", sketch.projects.Project, (function () {
        return {
            _constructor:function(){
                this.defaultScreenType = 'iPhone 6';
            },
            setupThemes:function () {
                var napkinTheme = {
                    styles:{
                        app:{
                            isCrazy:true
                        },
                        page:{
                            background:fwk.Brush.White
                        }
                    },
                    styleFor:{
                        'sketch.Application': 'app',
                        'sketch.ui.pages.PortableDevicePage':'page'
                    },
                    systemColors:{
                        '#686868':{
                            "ios.label":"Label",
                            "default.stroke": "Default stroke"
                        },
                        "#515151":{
                            "default.text":"Default text"
                        },
                        "#E8E8E8":
                        {
                            "fill.light":"Light fill"
                        },
                        "#FF3A30":
                        {
                            "fill.delete":'Delete button fill'
                        },
                        "#FF9500":
                        {
                            "fill.flag":'Flag button fill'
                        },
                        "#3E70A7":
                        {
                            "fill.archive":'Archive button fill'
                        },
                        "#1C78FE":
                        {
                            "fill.mark":'Mark button fill',
                            "color.link":'Link color'
                        },
                        "#CCC": {
                            "disabled.stroke": "Disabled border color"
                        },
                        "#e5e5e5": {
                            "disabled.fill": "Disabled fill color"
                        },
                        "#aaa": {
                            "disabled.text": "Disabled text color"
                        }
                    }
                };

                this._themes = {
                    "napkin":new sketch.projects.Theme(napkinTheme)
                };
            },
            loadInternal:function(app, deferred){
                fwk.Font.setDefaults({
                    family:fwk.FontInfo.defaultNapkinFont,
                    size: 28,
                    weight: "300"
                });

                ui.IconsInfo.defaultFontFamily = 'NinjamockBasic2';

                if(!this._projectSetup){
                     this.setupThemes();
                    this._projectSetup = true;
                }

                this.loadStrings();
                deferred.resolve();
            }

        }
    })());
})(sketch.framework, sketch.ui);