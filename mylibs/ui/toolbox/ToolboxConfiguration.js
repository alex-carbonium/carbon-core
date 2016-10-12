import {TileSize} from "framework/Defs";
import tiler from "ui/toolbox/tiler";
import ContextPool from "framework/render/ContextPool";
import Environment from "environment";
import FileProxy from "server/FileProxy";
import Deferred from "framework/Deferred";


var PADDING = 5;
var _configCache = {};
export default class ToolboxConfiguration {

    static renderElementsToSprite(elements, outConfig) {
        if (!elements.length) {
            return "";
        }
        var elementWithTiles = elements.map(e=> {
            if (e.props.tileSize === TileSize.Auto) {
                var tileSize = tiler.chooseTileType(e.width(), e.height());
            } else {
                tileSize = e.props.tileSize;
            }
            return {tileSize: tileSize, element: e};
        })
        elementWithTiles.sort((a, b)=> {
            return b.tileSize - a.tileSize;
        });
        var x = 0;
        var y = 0;
        var height = 0;
        var i = 0;
        var countOnLine = 1;
        var renderTasks = [];
        while (elementWithTiles[i].tileSize === TileSize.XLarge && i < elementWithTiles.length) {
            var element = elementWithTiles[i].element;
            var tileSize = elementWithTiles[i].tileSize;
            var data = tiler.fitToTile(element.width(), element.height(), tileSize, PADDING);
            renderTasks.push({x, y, data: data});
            x += data.width;
            height = Math.max(height, data.height);
            ++i;
            countOnLine = 2;
        }

        var counter = 0;
        var lastX = x;
        var prevTileSize = elementWithTiles[i].tileSize;
        while (i < elementWithTiles.length) {
            var element = elementWithTiles[i].element;
            var tileSize = elementWithTiles[i].tileSize;

            if (prevTileSize !== tileSize) {
                counter = 0;
                x = lastX;
                y = 0;
            }

            var data = tiler.fitToTile(element.width(), element.height(), tileSize, PADDING);
            renderTasks.push({x, y, data: data});
            height = Math.max(height, data.height);
            if ((counter + 1) % countOnLine === 1) {
                y += data.height;
                lastX = x + data.width;
            } else {
                x += data.width;
                lastX = x;
                y = 0;
            }
            ++i;
            ++counter;
        }

        var width = lastX;
        var contextScale = 1;//Environment.view.contextScale;
        var context = ContextPool.getContext(width, height, contextScale);
        var env = {finalRender: true};
        for (var i = 0; i < renderTasks.length; ++i) {
            var t = renderTasks[i];
            var element = elementWithTiles[i].element;
            var w = element.width();
            var h = element.height();
            var scale = t.data.scale;
            context.resetTransform();
            context.scale(contextScale, contextScale);

            context.translate(t.x + 0 | (t.data.width - w * scale) / 2, t.y + 0 | (t.data.height - h * scale) / 2);

            context.scale(scale, scale);
            element.drawSelf(context, w, h, env);
            outConfig.push({
                "autoPosition": "center",
                "id": element.id(),
                "realHeight": w,
                "realWidth": h,
                "spriteMap": [t.x * contextScale, t.y * contextScale, t.data.width * contextScale, t.data.height * contextScale],
                "title": element.name()
            });
        }

        return context.canvas.toDataURL("image/png");
        ;
    }

    static getConfigForPage(page){
        if(page.props.toolboxConfigUrl){
            var config = _configCache[page.props.toolboxConfigUrl];
            if(config){
                return Deferred.createResolvedPromise(config);
            }
            return fetch(page.props.toolboxConfigUrl).then(r=>r.json()).then(function(config){
                _configCache[page.props.toolboxConfigUrl] = config;
                return config;
            });
        }

        return ToolboxConfiguration.buildToolboxConfig(page)
    }

    static buildToolboxConfig(page){
        var elements = page.getAllArtboards().filter(x=>x.props.showInToolbox);

        if(!elements.length) {
            page.setProps({toolboxConfigUrl:null});
            return Deferred.createResolvedPromise({groups:[]});
        }

        var groupedElements = {};
        for(var i = 0; i < elements.length; ++i){
            var e = elements[i];
            var group = groupedElements[e.props.toolboxGroup] || [];
            group.push(e);
            groupedElements[e.props.toolboxGroup] = group;
        }
        var groups = [];
        function makeGroup(group, elements){
            var config = [];
            var spriteUrl = ToolboxConfiguration.renderElementsToSprite(elements, config);
            var group = {
                name:group,
                templates:config
            };
            groups.push(group);

            var deferred = Deferred.create();

            FileProxy.uploadPublicImage(spriteUrl)
                .then((data)=>{
                    group.spriteUrl = data.url;
                    deferred.resolve();
                });

            return deferred.promise();
        }
        var promises = [];
        for(var group in groupedElements) {
            promises.push(makeGroup(group, groupedElements[group]));
        }

        var config = {groups:groups};
        return Deferred.when(promises)
            .then(()=>FileProxy.uploadPublicFile(JSON.stringify(config)))
            .then((data)=>{
                page.setProps({toolboxConfigUrl:data.url});
                return config;
            })
    }
}