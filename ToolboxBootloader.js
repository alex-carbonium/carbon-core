import Environment from "environment";

define(function(require){
    var tilePadding = 2;

    require("./mylibs/params");
    require("./globalRequire");

    var App = require("App");
    var OfflineModel = require("../app/offline/OfflineModel");
    var Deferred = require('framework/Deferred');
    var PageGroup = require('framework/PageGroup');
    var Page = require("framework/Page");
    var TemplatedElement = require("framework/TemplatedElement");
    var Rectangle = require("framework/Rectangle");
    var Brush = require("framework/Brush");
    var tiler = require("ui/toolbox/tiler");

    var app = App.Current = new App();
    app.offlineModel = new OfflineModel();
    app.isExporting = true;
    app.theme(sketch.params.theme);
    app.loaded.then(function(){
        var toolboxes = [
            {config: require("./mylibs/ui/toolbox/config/WebToolbox"), regex: /(common|charts|web)\/(templates|composites)/g},
            {config: require("./mylibs/ui/toolbox/config/AndroidToolbox"), regex: /((common|android|charts)\/(templates|composites))|(android\/)/g}
        ];

        var promise = null;
        for (var i = 0; i < toolboxes.length; i++){
            var toolbox = toolboxes[i];
            var end = i === toolboxes.length - 1;
            if (promise){
                promise = (function(toolbox, end){
                    return promise.then(function(){processProject(toolbox.config, toolbox.regex, end)})
                })(toolbox, end);
            }
            else{
                promise = processProject(toolbox.config, toolbox.regex, end);
            }
        }
    });
    window.App = App;
    sketch.params.projectType = "WebProject"; //just initial project to start the app
    app.run();

    function processProject(toolboxConfig, pathRegex, end){
        console.log("Processing " + toolboxConfig.projectType);
        toolboxConfig = extend(true, {}, toolboxConfig);

        return loadTemplates(pathRegex).then(function(templates){
            templates = templates.filter(function(x){ return x.properties && x.properties.system });
            for (var i = 0; i < templates.length; i++){
                var templateData = templates[i];
                app.resources.createSystemTemplateFromJson(extend(true, {}, templateData));
            }

            return app.loadSatelliteProjects([toolboxConfig.projectType]).then(function(){
                var group = new PageGroup(1);
                var page = new Page();
                page.groupId(group.id());

                app.addPageGroup(group);
                app.addPage(page);
                app.setActivePage(page);

                page.scale(1);
                page.scrollTo({scrollX: 0, scrollY: 0});

                var placeData = [];
                foreachTemplate(toolboxConfig, function(templateId, group, templateIndex){
                    var templatedElement = new TemplatedElement();
                    var element = templatedElement;
                    templatedElement.templateId(templateId);
                    templatedElement.clipSelf(false);

                    var realRect = templatedElement.getBoundaryRect();
                    var tileSize = tiler.fitToTile(element.width(), element.height(), templatedElement.toolboxTileType(), tilePadding);

                    var template = templatedElement.getTemplate();
                    var templateConfig = {
                        id: templateId,
                        spriteUrl: toolboxConfig.spriteUrl,
                        title: template.templateName(),
                        autoPosition: template.autoPosition(),
                        realWidth: realRect.width,
                        realHeight: realRect.height
                    };

                    placeData.push({
                        element: element,
                        tileSize: tileSize,
                        templateConfig: templateConfig
                    });

                    group.templates[templateIndex] = templateConfig;
                });

                var placed = placeElements(placeData);
                //app.view.context.canvas.width = placed.width;
                //app.view.context.canvas.height = placed.height;
                Environment.view.width(placed.width);
                Environment.view.height(placed.height);

                for (var i = 0; i < placeData.length; i++){
                    //var config = placeData[i].templateConfig;
                    //var tile = new Rectangle().init({
                    //    borderBrush: Brush.None(),
                    //    backgroundBrush: Brush.createFromColor("lightsalmon"),
                    //    opacity: 1,
                    //    left: config.spriteMap[0],
                    //    top: config.spriteMap[1],
                    //    width: config.spriteMap[2],
                    //    height: config.spriteMap[3]
                    //});
                    //page.add(tile);
                    page.add(placeData[i].element);
                }

                Environment.view.invalidate();
                Environment.view.draw();

                return waitUntilRendered(app, toolboxConfig, templates, end);
            });
        });
    }

    function waitUntilRendered(app, toolboxConfig, templates, end){
        var dfd = Deferred.create();
        function wait(){
            if (Environment.view.renderingScheduled()){
                setTimeout(wait, 50);
            }
            else {
                console.log("Rendering finished");
                if (window.callPhantom){
                    window.callPhantom({result: true, toolboxConfig: toolboxConfig, templates: templates, end: end});
                }
                dfd.resolve();
            }
        }
        wait();
        return dfd.promise();
    }

    function foreachTemplate(toolboxConfig, cb){
        for (var i = 0; i < toolboxConfig.groups.length; i++){
            var group = toolboxConfig.groups[i];
            for (var j = 0; j < group.templates.length; j++){
                var template = group.templates[j];
                cb(template, group, j);
            }
        }
    }

    function placeElements(placeData){
        var maxX = 0;
        var maxY = 0;
        var x = 0;
        var y = 0;
        var col = 0;

        placeData.sort(function(a, b){
            var w1 = a.element.width() * a.tileSize.scale;
            var w2 = b.element.width() * b.tileSize.scale;
            return w2 - w1;
        });

        for (var i = 0; i < placeData.length; i++){
            var element = placeData[i].element;
            var tileSize = placeData[i].tileSize;
            var templateConfig = placeData[i].templateConfig;

            var sw = ~~(element.width() * tileSize.scale);
            var sh = ~~(element.height() * tileSize.scale);
            if (element.scaleContent()){
                element.width(sw);
                element.height(sh);
            }
            else {
                element.customScale({x: tileSize.scale, y: tileSize.scale});
            }

            var centerOffset = getElementCenteredPosition(sw, sh, tileSize);

            element.left(x + centerOffset.left);
            element.top(y + centerOffset.top);

            templateConfig.spriteMap = [
                x,
                y,
                tileSize.width,
                tileSize.height];

            //options.verbose && console.log('placed %s: ', placeData[i].templateId, element.getBoundaryRect());

            y += tileSize.height + tilePadding;

            maxX = Math.max(maxX, x + tileSize.width);
            maxY = Math.max(maxY, y + tileSize.height);

            //var newCol = ~~(i / 20);
            //if (newCol !== col){
            //    col = newCol;
            //    x = maxX;
            //    y = tilePadding;
            //}
        }

        return {
            width: maxX,
            height: maxY
        };
    }
    function getElementCenteredPosition(ew, eh, tileSize){
        var left = 0, top = 0;
        var w = tileSize.width;
        var h = tileSize.height;
        if(w && w > ew) {
            left = ~~((w - ew)/2)
        }
        if(h && h > eh) {
            top = ~~((h - eh)/2)
        }

        return {left:left, top:top};
    }

    function loadTemplates(r){
        var Deferred = require('framework/Deferred');
        var req = require.context("ui", true);
        var res = req.keys().filter(function(x){ return r.test(x); }).map(req);
        return Deferred.createResolvedPromise(res);
    }
});