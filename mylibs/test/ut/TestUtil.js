import * as params from "../../params";
import * as globals from "../../../globalRequire";
import * as facade from "../../CarbonCore";

import TestPlatform from "./TestPlatform";
import TestFontManager from "./TestFontManager";

import NullContainer from "../../framework/NullContainer";

import App from "app";

import ArtboardPage from "ui/pages/ArtboardPage";
import OfflineModel from "offline/OfflineModel";
import Command from "framework/commands/Command";
import CompositeCommand from "framework/commands/CompositeCommand";
import commandManager from "framework/commands/CommandManager";
import DeferredPrimitives from "framework/sync/DeferredPrimitives";
import DesignerView from "framework/DesignerView";
import DesignerController from "framework/DesignerController";
import Layer from "framework/Layer";
import SelectComposite from "framework/SelectComposite";
import SelectFrame from "framework/SelectFrame";
import DraggingElement from "framework/interactions/DraggingElement";
import Environment from "environment";
import backend from "backend";
import logger from "logger";

var defaults = {
    offlineEnabled: false,
    addPage: true
};

facade.app.dispose();
facade.CoreIntl.registerTestInstance();

var Util = {};

Util.setupApp = function(options){
    options = extend({}, defaults, options);

    var app = new App(true);
    App.Current = app;
    app.id(10);

    app.platform = new TestPlatform();
    app.fontManager = new TestFontManager();
    app.fontManager.registerAsDefault();

    var c = document.createElement("canvas");
    var context = c.getContext("2d");

    var view = new DesignerView(app);
    view.setup({Layer, SelectComposite, DraggingElement, SelectFrame});
    view.attachToDOM(context, context, c, x => {}, x => {}, x=> {});
    var controller = new DesignerController(app, view, {SelectComposite, DraggingElement, SelectFrame});
    Environment.set(view, controller);

    if (options.addPage){
        var page = new ArtboardPage();
        page.id("Page");
        app.addPage(page);
        app.setActivePage(page);
        page.children[0].id("Artboard");
    }

    app.offlineModel = new OfflineModel();

    app.reload = function(){
        var json = this.toJSON();
        this.isLoaded = false;
        this.clear();
        this.fromJSON(json);
    };

    app.createSavePoint = function(){
        this.modelSyncProxy.clearPendingChanges();
        var json = this.toJSON();
        return extend(true, {}, json);
    };
    app.replayFromSavePoint = function(savepoint){
        this.isLoaded = false;
        this.state.setExternalChange(true);
        var activePageId = this.activePage.id();
        this.fromJSON(savepoint);
        var primitives = this.modelSyncProxy.getPendingChanges();
        for (var i = 0; i < primitives.length; i++){
            var p = primitives[i];
            DeferredPrimitives.register(p);
        }
        this.relayout();
        this.setActivePageById(activePageId);
        this.state.setExternalChange(false);
        this.isLoaded = true;
    };

    app.raiseLoaded();

    return app;
};

Util.setupServerSave = function(app, opt){
    // opt = extend({}, opt);
    // var proxy = new DesignerProxy();
    // var originalSave = proxy.saveProjectData;
    // proxy.post = function(url, data){
    //     var response = { success: true, version: "vnext" };
    //     _url = url;
    //     _data = data;
    //     if (opt.json){
    //         response = extend(response, opt.json);
    //     }
    //
    //     if (opt.beforeSuccess){
    //         opt.beforeSuccess(url, data);
    //     }
    //
    //     return fwk.Deferred.createResolvedPromise(response);
    // }
    //
    // proxy.saveProjectData = function(){
    //     return originalSave.apply(this, arguments).then(function(){
    //         if (opt.afterSuccess){
    //             opt.afterSuccess();
    //         }
    //         return this;
    //     });
    // }

    //app.container.registerInstance(DesignerProxy, proxy);
};

Util.wait = function(owner, checkCallback, assertCallback, msg, maxTime){
    if (maxTime === undefined){
        maxTime = 5000;
    }
    var waited = 0;
    var interval = 50;
    var check = function(){
        var res = checkCallback.call(owner);
        if (res){
            assertCallback.call(owner, res);
            start();
        }
        else{
            waited += interval;
            if (waited >= maxTime){
                ok(false, msg + " (max waiting time exceeded: " + maxTime + ")");
                start();
            }
            else {
                setTimeout(check, interval);
            }
        }
    };
    setTimeout(check, 1);
};

Util.waitFor = function (requestCallback, checkCallback, assertCallback) {
    var maxTime = 5000;
    var waited = 0;
    var interval = 50;
    var timer;

    function resume(failMessage){
        if (failMessage){
            ok(false, failMessage);
        }
        clearTimeout(timer);
        start();
    }

    function checkSucceeded(data) {
        requestCallback = null;
        var assertPromise = assertCallback(data);
        if (assertPromise){
            assertPromise
                .then(function(){
                    resume();
                })
                .fail(function(){
                    resume("Promise failed while waiting for assert");
                });
        }
        else {
            resume();
        }
    }

    var requestInProgress = false;
    var check = function () {
        waited += interval;
        if (waited >= maxTime) {
            resume("Test failed because timeout is exceeded while waiting for result");
        }
        else {
            if (!requestInProgress && requestCallback){
                requestCallback()
                    .then(function(data){
                        if (checkCallback(data)){
                            checkSucceeded(data);
                        }
                    })
                    .always(function(){
                        requestInProgress = false;
                    });
                requestInProgress = true;
            }
            timer = setTimeout(check, interval);
        }
    };
    timer = setTimeout(check, 1);
};

Util.createEvent = function(x, y){
    var event = {layerX: x, layerY: y};
    return event;
};

class Cmd extends Command{}
Util.executeAnyCommand = function(){
    commandManager.execute(new Cmd());
};

Util.runCommands = function(commands){
    var command = new CompositeCommand(commands);
    commandManager.execute(command);
};

export default Util;