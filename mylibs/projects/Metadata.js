define(function(){
    return {
        projects: {
            WebProject: {
                displayName: "Web stencils",
                url: "projects/WebProject",
                exports: "sketch.projects.Project",
                fontsWithIcons: ["NinjamockBasic2"],
                requireDeps: ["charts"],
                resourcePrefixes: ["web."]
            },
            AndroidProject: {
                displayName: "Android stencils",
                url: "target/android.min",
                exports: "sketch.projects.AndroidProject",
                fontsWithIcons: ["NinjamockAndroid", "NinjamockBasic2"],
                requireDeps: ["charts"],
                resourcePrefixes: ["android."]
            },
            Win8Project: {
                displayName: "Windows 8 stencils",
                url: "target/win8.min",
                exports: "sketch.projects.Win8Project",
                fontsWithIcons: ["NinjamockWin8", "NinjamockBasic2"],
                fonts: {
                    google: { families: ["Open Sans:300,400,700"] }
                },
                requireDeps: ["charts"],
                resourcePrefixes: ["win8."]
            },
            WP8Project: {
                displayName: "Windows Phone stencils",
                url: "target/wp8.min",
                exports: "sketch.projects.WP8Project",
                fontsWithIcons: ["NinjamockWin8", "NinjamockBasic2"],
                fonts: {
                    google: { families: ["Open Sans:300,400,700"] }
                },
                deps: ["Win8Project"],
                requireDeps: ["charts"],
                resourcePrefixes: ["wp8.", "win8."]
            },
            FreeStyleProject: {
                displayName: "Free-hand stencils",
                url: "target/freestyle.min",
                exports: "sketch.projects.FreeStyleProject",
                fontsWithIcons: ["NinjamockBasic2", "NinjamockBasic"]
            },
            iPhone: {
                displayName: "iPhone stencils",
                url: "target/ios.min",
                exports: "sketch.projects.iPhone",
                requireDeps: ["charts"],
                fontsWithIcons: ["NinjamockBasic2"]
            },
            iPad: {
                displayName: "iPad stencils",
                url: "target/ios.min",
                exports: "sketch.projects.iPad",
                requireDeps: ["charts"],
                fontsWithIcons: ["NinjamockBasic2"]
            },
            nav2015: {
                displayName: "Dynamics NAV 2015",
                url: "target/dynamics.min",
                exports: "sketch.projects.Nav2015Project",
                fontsWithIcons: ["NinjamockBasic2", "NinjamockBasic"],
                requireDeps: ["charts"],
                resourcePrefixes: ["dynamics."]
            }
        },

        determineProjects: function(elementJson){
            var type = elementJson.type === "sketch.framework.TemplatedElement" ?
                elementJson.props.templateId :
                elementJson.type;

            if (/ui\.iphone/.test(type)){
                return ["iPhoneProject", "iPadProject"];
            }
            if (/ui\.android/.test(type)){
                return ["AndroidProject"];
            }
            if (/ui\.win8/.test(type)){
                return ["Win8Project"];
            }
            if (/ui\.wp8/.test(type)){
                return ["WP8Project", "Win8Project"];
            }
            if (/ui\.web/.test(type)){
                return ["WebProject"];
            }
            return [];
        }
    };
});