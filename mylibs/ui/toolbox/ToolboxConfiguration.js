import {TileSize, ArtboardResource} from "framework/Defs";
import tiler from "ui/toolbox/tiler";
import ContextPool from "framework/render/ContextPool";
import Environment from "environment";
import FileProxy from "server/FileProxy";
import Deferred from "framework/Deferred";
import {createUUID} from "util";
import Matrix from "math/matrix";

var PADDING = 5;
var _configCache = {};
export default class ToolboxConfiguration {

    static renderElementsToSprite(elements, outConfig, size, contextScale) {
        contextScale = contextScale || 1;
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

        while (i < elementWithTiles.length && elementWithTiles[i].tileSize === TileSize.XLarge) {
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
        while (i < elementWithTiles.length) {
            var prevTileSize = elementWithTiles[i].tileSize;
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
        size.width = width;
        size.height = height;
        var context = ContextPool.getContext(width, height, contextScale);
        context.clearRect(0,0, context.width, context.height);
        var env = {finalRender: true,  setupContext:()=>{},contextScale:contextScale, offscreen:true, view:{scale:()=>1, contextScale, focused:()=>false}};
        var elementsMap = {};
        for (var i = 0; i < renderTasks.length; ++i) {
            var t = renderTasks[i];
            var element = elementWithTiles[i].element;
            var w = element.width();
            var h = element.height();
            var scale = t.data.scale;
            var matrix = Matrix.Identity.clone();
            context.save();
            context.scale(contextScale, contextScale);
            context.beginPath();
            context.rect(t.x, t.y, t.data.width, t.data.height);
            context.clip();

            env.setupContext=(context) => {
                context.scale(contextScale, contextScale);
                env.pageMatrix.applyToContext(context);
            }

            matrix.translate(t.x + 0 | (t.data.width - w * scale) / 2, t.y + 0 | (t.data.height - h * scale) / 2);
            matrix.scale(scale, scale);
            matrix.append(element.viewMatrix().clone().invert());
            env.pageMatrix = matrix;
            matrix.applyToContext(context);

            element.draw(context, env);
            context.restore();

            elementsMap[element.id()] = {
                "autoPosition": "center",
                "id": element.id(),
                "realHeight": w,
                "realWidth": h,
                "spriteMap": [t.x * contextScale, t.y * contextScale, t.data.width * contextScale, t.data.height * contextScale],
                "title": element.name()
            };
        }

        if(outConfig) {
            for (var i = elements.length - 1; i >= 0; --i) {
                outConfig.push(elementsMap[elements[i].id()]);
            }
        }

        var res =  context.canvas.toDataURL("image/png");
        ContextPool.releaseContext(context);
        return res;
    }

    static getConfigForPage(page){
        if(page.props.toolboxConfigUrl && page.props.toolboxConfigUrl !== '#'){
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
        var elements = page.getAllArtboards().filter(x=>x.props.resource === ArtboardResource.Stencil);

        if(!elements.length) {
            page.setProps({toolboxConfigUrl:null});
            return Deferred.createResolvedPromise({groups:[]});
        }

        var configId = createUUID();

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
            var size ={};
            var spriteUrl = ToolboxConfiguration.renderElementsToSprite(elements, config, size);

            var spriteUrl2x = ToolboxConfiguration.renderElementsToSprite(elements, null, size, 2);
            var group = {
                name:group,
                templates:config
            };
            groups.push(group);
            var d1 = Deferred.create();
            var d2 = Deferred.create();

            if(App.Current.serverless()){
                group.spriteUrl = spriteUrl;
                group.spriteUrl2x = spriteUrl2x;
                group.size = size;
                return Deferred.createResolvedPromise();
            }

            FileProxy.uploadPublicImage(spriteUrl)
                .then((data)=>{
                    group.spriteUrl = data.url;
                    d1.resolve();
                });

            FileProxy.uploadPublicImage(spriteUrl2x)
                .then((data)=>{
                group.spriteUrl2x = data.url;
                group.size = size;
                d2.resolve();
            });

            return Deferred.when(d1, d2);
        }
        var promises = [];
        for(var group in groupedElements) {
            promises.push(makeGroup(group, groupedElements[group]));
        }

        var config = {groups:groups, id:configId};
        return Deferred.when(promises)
            .then(()=>{
                if(App.Current.serverless()){
                    return {url:'#', configId:createUUID()};
                }
                return FileProxy.uploadPublicFile(JSON.stringify(config))
            })
            .then((data)=>{
                page.setProps({toolboxConfigUrl:data.url, toolboxConfigId:configId});
                return config;
            })
    }
}