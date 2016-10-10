import {ChangeMode} from "../framework/Defs";

define(["projects/Project", "ui/IconsInfo", "ui/pages/ArtboardPage"], function (Project, IconsInfo, ArtboardPage) {
    var fwk = sketch.framework;

    return klass2("sketch.projects.WebProject", Project, (function () {
        return {
            _constructor: function () {
                this.landscapeSupported = false;
                this.portraitSupported = true;
                this.templateSupported = false;
                this.defaultScreenType = 'Browser';
            },
            loadInternal: function (app, deferred) {
                // fwk.Font.setDefaults({
                //     family: fwk.FontInfo.defaultNapkinFont,
                //     size: 22,
                //     weight: "300"
                // });
                IconsInfo.defaultFontFamily = 'NinjamockBasic2';
                deferred.resolve();
            },
            createNewPage: function (type) {
                var page = new ArtboardPage();

                page.setProps({
                    screenType: this.defaultScreenType,
                    orientation: (type || "portrait"),
                    width:1000,
                    height:1000
                }, ChangeMode.Self);
                //since page is a primitive root, it will fire model tracking event,
                //causing wrong order if primitives

                return page;
            }
        }
    })());
});
