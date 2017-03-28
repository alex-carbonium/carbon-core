import {TileSize, ArtboardResource} from "framework/Defs";
import tiler from "./tiler";
import ContextPool from "framework/render/ContextPool";
import Environment from "environment";
import FileProxy from "server/FileProxy";
import {createUUID} from "util";
import Matrix from "math/matrix";
import { Dictionary } from "carbon-core";

var PADDING = 5;
var _configCache = {};
export default class ToolboxConfiguration {

    static renderElementsToSprite(elements, outConfig, contextScale?): Promise<any> {
        contextScale = contextScale || 1;
        if (!elements.length) {
            return Promise.resolve({});
        }
        let elementWithTiles : Array<any> = elements.map(e=> {
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
        let x : number = 0;
        let y: number = 0;
        let height: number = 0;
        let i: number = 0;
        let countOnLine: number = 1;
        let renderTasks = [];
        let prevTileSize: number = -1;

        while (i < elementWithTiles.length && elementWithTiles[i].tileSize === TileSize.XLarge) {
            var element = elementWithTiles[i].element;
            var tileSize = elementWithTiles[i].tileSize;
            var data = tiler.fitToTile(element.width(), element.height(), tileSize, PADDING);
            renderTasks.push({x, y, data: data});
            x += data.width;
            height = Math.max(height, data.height);
            ++i;
            countOnLine = 2;
            prevTileSize = tileSize;
        }

        var counter = 0;
        var lastX = x;

        while (i < elementWithTiles.length) {
            let element = elementWithTiles[i].element;
            let tileSize = elementWithTiles[i].tileSize;

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
            prevTileSize = tileSize;
        }

        var width: number = lastX;
        var context  = ContextPool.getContext(width, height, contextScale, true);
        context.clearRect(0,0, context.width, context.height);
        var env = {finalRender: true,  setupContext:()=>{}, contextScale:contextScale, offscreen:true, view:{scale:()=>1, contextScale, focused:()=>false}};
        var elementsMap = {};
        var taskPromises = [];
        for (i = 0; i < renderTasks.length; ++i) {
            taskPromises.push(ToolboxConfiguration._performRenderTask(renderTasks[i], elementWithTiles[i].element, elementsMap, context, contextScale, env));
        }

        return Promise.all(taskPromises)
            .then(() => {
                if(outConfig) {
                    for (i = elements.length - 1; i >= 0; --i) {
                        outConfig.push(elementsMap[elements[i].id()]);
                    }
                }

                return {imageData: context.canvas.toDataURL("image/png"), size: {width, height}};
            })
            .finally(() => {
                ContextPool.releaseContext(context);
            });
    }

    static _performRenderTask(t, element, elementsMap, context, contextScale, env): Promise<any>{
        var w = element.width();
        var h = element.height();
        var scale = t.data.scale;
        var matrix = Matrix.Identity.clone();
        context.save();
        context.scale(contextScale, contextScale);
        context.beginPath();
        context.clearRect(t.x, t.y, t.data.width, t.data.height);
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

        try {
            element.standardBackground(false);
            element.draw(context, env);
        }
        finally {
            element.standardBackground(true);
        }

        context.restore();

        elementsMap[element.id()] = {
            "autoPosition": "center",
            "id": element.id(),
            "realHeight": w,
            "realWidth": h,
            "spriteMap": [t.x * contextScale, t.y * contextScale, t.data.width * contextScale, t.data.height * contextScale],
            "title": element.name()
        };

        var fontTasks = App.Current.fontManager.getPendingTasks();
        if (!fontTasks.length){
            return Promise.resolve();
        }

        return Promise.all(fontTasks)
            .then(() => ToolboxConfiguration._performRenderTask(t, element, elementsMap, context, contextScale, env));
    }

    static getConfigForPage(page){
        if(page.props.toolboxConfigUrl && page.props.toolboxConfigUrl !== '#'){
            var config = _configCache[page.props.toolboxConfigUrl];
            if(config){
                return Promise.resolve(config);
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
            return Promise.resolve({groups:[]});
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
        function makeGroup(groupName, elements): Promise<any>{
            var config = [];
            var spriteUrlPromise = ToolboxConfiguration.renderElementsToSprite(elements, config);

            var spriteUrl2xPromise = ToolboxConfiguration.renderElementsToSprite(elements, null, 2);
            let group: Dictionary = {
                name:groupName,
                templates:config
            };
            groups.push(group);

            if(App.Current.serverless()){
                return Promise.all([spriteUrlPromise, spriteUrl2xPromise])
                    .then(sprites => {
                        group.spriteUrl = sprites[0].imageData;
                        group.spriteUrl2x = sprites[1].imageData;
                        group.size = sprites[0].size;
                    });
            }

            spriteUrlPromise = spriteUrlPromise.then(sprite =>{
                return FileProxy.uploadPublicImage(sprite.imageData)
                    .then((data)=>{
                        group.spriteUrl = data.url;
                        group.size = sprite.size;
                    })
            });

            spriteUrl2xPromise = spriteUrl2xPromise.then(sprite =>{
                return FileProxy.uploadPublicImage(sprite.imageData)
                    .then((data)=>{
                        group.spriteUrl2x = data.url;
                    })
            });

            return Promise.all([spriteUrlPromise, spriteUrl2xPromise]);
        }
        var promises = [];
        for(let group in groupedElements) {
            promises.push(makeGroup(group, groupedElements[group]));
        }

        var config = {groups:groups, id:configId};
        return Promise.all(promises)
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