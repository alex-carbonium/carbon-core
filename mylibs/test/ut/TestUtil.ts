import { app, Artboard, Layer, Context, Environment, logger, RelayoutQueue, ArtboardPage, AppClass, CoreIntl, backend, SelectFrame, SelectComposite, Container, UIElement, DesignerView, DesignerController, ContextType } from "carbon-core";

import TestPlatform from "./TestPlatform";
import TestFontManager from "./TestFontManager";

var defaults = {
    offlineEnabled: false,
    addPage: true
};

app.dispose();
CoreIntl.registerTestInstance();

var Util: any = {};

Util.setupApp = function(options){
    options = extend({}, defaults, options);

    var app = new AppClass() as any;
    App.Current = app;
    app.id = ("10");

    app.platform = new TestPlatform();
    app.fontManager = new TestFontManager(app);
    app.fontManager.registerAsDefault();

    var c = document.createElement("canvas");
    var mainContext = new Context(ContextType.Content, c);
    var interactionContext = new Context(ContextType.Interaction, c);
    var isolationContext = new Context(ContextType.Isolation, c);

    var viewContainer = document.createElement("div");

    var view: any = new DesignerView(app);
    view.setup({Layer, SelectComposite, SelectFrame});
    view.attachToDOM([mainContext, isolationContext, interactionContext], viewContainer, x => {}, x => {}, x=> {});
    var controller = new DesignerController(app, view);
    Environment.set(view, controller);

    if (options.addPage){
        var page = new ArtboardPage();
        page.id = ("Page");
        app.addPage(page);
        app.setActivePage(page);
        page.children[0].id = ("Artboard");
    }

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
        var activePageId = this.activePage.id;
        this.fromJSON(savepoint);
        var primitives = this.modelSyncProxy.getPendingChanges();
        RelayoutQueue.enqueueAll(primitives);
        this.relayout();
        this.setActivePageById(activePageId);
        this.state.setExternalChange(false);
        this.isLoaded = true;
    };

    app.raiseLoaded();

    return app;
};

export function createArtboard(name: string) {
    let artboard = new Artboard();
    artboard.name = (name);
    return artboard;
}

export function createElement(name: string) {
    let element = new UIElement();
    element.name = (name);
    return element;
}

export function createContainer(name: string) {
    let container = new Container();
    container.name = (name);
    return container;
}

export default Util;