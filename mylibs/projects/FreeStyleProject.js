define(["projects/Project"], function(Project){
    var fwk = sketch.framework;
    var ui = sketch.ui;

    return klass2("sketch.projects.FreeStyleProject", Project, (function () {
        return {
            _constructor:function(){
                this.landscapeSupported = false;
                this.portraitSupported = true;
                this.templateSupported = false;
                this.defaultScreenType = 'None';
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
                        '#fff':{
                        },
                        '#000':{
                            "default.text":"Text color"
                        },
                        '#686868':{
                            "icon.fill": "Icon fill"
                        },
                        'red':{
                        },
                        'green':{
                        },
                        'blue':{
                        },
                        'yellow':{
                        },
                        "#515151":{
                        },
                        "#e5e5e5":{
                        },
                        "rgb(217,90,0)":{
                        },
                        "rgb(160,160,160)":{
                        },
                        "rgba(0,0,0,0)":{
                        }
                    }
                };

                this._themes = {
                    "napkin":new sketch.projects.Theme(napkinTheme)
                };
            },
            loadThemes:function(app, deferred){
                fwk.Font.setDefaults({
                    family:fwk.FontInfo.defaultNapkinFont,
                    size: 21,
                    weight: "300"
                });

                ui.IconsInfo.defaultFontFamily = "NinjamockBasic2";

                if(!this._themesCreated){
                    this.setupThemes();
                    this._themesCreated = true;
                }

                this.loadStrings();
                app.properties.theme.possibleValues({"napkin":"Napkin"});
                deferred.resolve();
            },
            loadToolbox:function(toolbox){
                toolbox.clear();
                toolbox.setup({
                    categories:{
                        basic:{
                            label:"Basic",
                            expanded:true,
                            items: [
                                "ui.common.composites.ImageTemplate",
                                "ui.common.composites.IconTemplate",
                                "ui.common.composites.LabelTemplate",
                                "ui.common.composites.ClickSpot",
                                "ui.common.composites.TextBlockTemplate"
                            ]
                        }
                    }
                });

                Project.prototype.loadToolbox.apply(this, arguments);
            }

        }
    })());
});