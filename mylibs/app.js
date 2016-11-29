//v1.1
// TODO: allow users to override system templates (when system template is save new asset should be added)
// BUG: proeprties which are added to template programmaticaly are serialized into temlate, and failed during loading
// TODO: disable width/height properties if controls is not allowed to resize
// BUG: templated element can be dropped inside itself when part of multiselection!!
// BUG: custom template properties are reseted when stop editing template (select tile control, set active to false, edit tempalte and then close editor, active property is reseted)
// TODO: optimize way the path is serialized (do smth like SVG)
// BUG: templated element children are in wrong container after restoring from json
// TODO: think what to do with element names, they should not be part of a project, becuase it will be impossible to reuse controls betwin projects (not possible to cusomize toolbox)

import LayoutGridLines from "extensions/guides/LayoutGridLines";
import LayoutGridColumns from "extensions/guides/LayoutGridColumns";
import CustomGuides from "extensions/guides/CustomGuides";
import Brush from "framework/Brush";
import PropertyTracker from "framework/PropertyTracker";
import Page from "framework/Page";
import StyleManager from "framework/style/StyleManager";
import OpenTypeFontManager from "./OpenTypeFontManager";
import {Types, FontWeight, FontStyle, PatchType, ChangeMode, StoryType, StyleType} from "./framework/Defs";
import Font from "./framework/Font";
import GroupContainer from "./framework/GroupContainer";
import CommandManager from "framework/commands/CommandManager";
import NullPage from "framework/NullPage";
import ModelStateListener from "framework/sync/ModelStateListener";
import DeferredPrimitives from "framework/sync/DeferredPrimitives";
import PrimitiveHandler from "framework/sync/Primitive_Handlers";
import PrimitiveSetCommand from "commands/PrimitiveSetCommand";
import {createUUID, formatPrimitive} from "./util";
import DesignerController from "framework/DesignerController";
import Selection from "framework/SelectionModel";
import Invalidate from "framework/Invalidate";
import Environment from "environment";
import ModelSyncProxy from "./server/ModelSyncProxy";
import Promise from "bluebird";
import DataNode from "./framework/DataNode";
import DataManager from "./framework/data/DataManager";
import CustomDataProvider from "./framework/data/CustomDataProvider";
import AppState from "./AppState";
import OfflineModel from "./offline/OfflineModel";
import Deferred from "framework/Deferred";
import Story from "stories/Story";

window.env = Environment;
window.Selection = Selection;

var debug = require("./DebugUtil")("carb:relayout");


var backend = require("backend");
var platform = require("platform/Platform");
var DependencyContainer = require("DependencyContainer");
var NullContainer = require("framework/NullContainer");
var Primitive = require("framework/sync/Primitive");
var Layer = require("framework/Layer");
var DraggingElement = require("framework/DraggingElement");
var SelectComposite = require("framework/SelectComposite");
var SelectFrame = require("framework/SelectFrame");
var extensions = require("extensions/All");
var actionManager = require("ui/ActionManager");
var ProjectsMetadata = require("projects/Metadata");
var domUtil = require("utils/dom");
var Stopwatch = require("./Stopwatch");
var WebFont = require("webfontloader");
var PropertyMetadata = require("framework/PropertyMetadata");
var WebProject = require("./projects/WebProject");
var Path = require("./ui/common/Path");
var CompoundPath = require("./ui/common/CompoundPath");

// using
var ui = sketch.ui,
    fwk = sketch.framework,
    sync = fwk.sync;

var findItemsToSelect = function (eventData) {
    var items = [];

    var elements = this.activePage.hitElements(eventData, Environment.view.scale());
    for (let i = 0, l = elements.length; i < l; ++i) {
        let e = elements[i];
        items.push({
            name: e.displayName(),
            callback: function (e) {
                Selection.makeSelection([e]);
            }.bind(this, e)
        });

    }

    return items;
};

var addComment = function (event) {
    var scale = Environment.view.scale();
    fwk.pubSub.publishSync("comment.addFromMenu", {
        x: ~~(domUtil.layerX(event) / scale),
        y: ~~(domUtil.layerY(event) / scale)
    });
};

function showClipboardDialog() {
    new sketch.windows.Dialog("viewmodels/ClipboardUsageDialog", {modal: true}).show();
}

function canDoPathOperations(selection) {
    if (selection.length < 2) {
        return false;
    }

    for (var i = 0; i < selection.length; ++i) {
        var e = selection[i];
        if (!(e instanceof Path) && !(e instanceof CompoundPath) && (typeof e.convertToPath !== "function")) {
            return false;
        }
    }
    return true;
}

function canFlattenPath(selection) {
    if (selection.length != 1) {
        return false;
    }

    var e = selection[0];
    return (e instanceof CompoundPath);
}

function canConvertToPath(selection) {
    if (selection.length < 1) {
        return false;
    }

    for (var i = 0; i < selection.length; ++i) {
        var e = selection[i];
        if (!e.canConvertToPath()){
            return false;
        }
    }
    return true;
}

// TODO: refactor context menu to build it in extensions
var onBuildDefaultMenu = function (context, menu) {
    var selectComposite = context.selectComposite;
    var selection = selectComposite.elements;

    // if(this.viewModel.commentsMode()){
    //     menu.addComment = {
    //         name:"Add comment",
    //
    //         callback:function()
    //         {
    //             addComment(context.event);
    //         }
    //     };
    //
    //     return false;
    // }

    var items = menu.items = [];

    var itemsToSelect = findItemsToSelect.call(this, context.eventData);
    if (itemsToSelect.length) {
        items.push({
            name: "Select",
            items: itemsToSelect
        });
        items.push('-');
    }

    items.push({
        name: "Copy",
        icon: "copy",
        callback: function () {
            showClipboardDialog();
        },
        disabled: !(selection && selection.length > 0)
    });

    items.push({
        name: "Cut",
        icon: "cut",
        callback: function () {
            showClipboardDialog();
        },
        disabled: !(selection && selection.length > 0)
    });

    items.push({
        name: "Paste",
        icon: "paste",
        callback: function () {
            showClipboardDialog();
        }
    });

    items.push({
        name: "Duplicate",
        icon: "duplicate",
        callback: function () {
            actionManager.invoke("duplicate");
        },
        disabled: !(selection && selection.length > 0)
    });

    items.push('-');
    items.push({
        name: "Delete",
        icon: "delete",
        callback: function () {
            actionManager.invoke("delete");
        },
        disabled: !(selection && selection.length > 0)
    });

    if (selection) {
        items.push('-');

        items.push({
            name: "Grouping",
            items: [
                {
                    name: "Group",
                    icon: "group",
                    callback: function () {
                        actionManager.invoke("groupElements");
                    },
                    disabled: !selection || selection.length <= 1
                },
                {
                    name: "Ungroup",
                    icon: "ungroup",
                    callback: function () {
                        actionManager.invoke("ungroupElements");
                    },
                    disabled: !selection || selection.length !== 1 || !(selection[0] instanceof GroupContainer)
                },
                {
                    name: "Mask",
                    icon: "mask",
                    callback: function () {
                        actionManager.invoke("groupWithMask");
                    },
                    disabled: !selection || selection.length < 2 || (typeof selection[0].drawPath !== 'function')
                }
            ]
        });
        items.push('-');


        items.push({
            name: "Path",
            items: [
                {
                    name: "Union",
                    icon: "pathUnion",
                    callback: function () {
                        actionManager.invoke("pathUnion");
                    },
                    disabled: !canDoPathOperations(selection)
                },
                {
                    name: "Intersect",
                    icon: "pathIntersect",
                    callback: function () {
                        actionManager.invoke("pathIntersect");
                    },
                    disabled: !canDoPathOperations(selection)
                },
                {
                    name: "Difference",
                    icon: "pathDifference",
                    callback: function () {
                        actionManager.invoke("pathDifference");
                    },
                    disabled: !canDoPathOperations(selection)
                },
                {
                    name: "Subtract",
                    icon: "pathSubtract",
                    callback: function () {
                        actionManager.invoke("pathSubtract");
                    },
                    disabled: !canDoPathOperations(selection)
                },
                {
                    name: "Flatten",
                    icon: "pathFlatten",
                    callback: function () {
                        actionManager.invoke("pathFlatten");
                    },
                    disabled: !canFlattenPath(selection)
                },
                {
                    name: "Convert to path",
                    icon: "convertToPath",
                    callback: function () {
                        actionManager.invoke("convertToPath");
                    },
                    disabled: !canConvertToPath(selection)
                }
            ]
        });
    }


    items.push({
        name: "Arrange",
        items: [
            {
                name: "Bring to Front",
                icon: "bring-to-front",
                callback: function () {
                    actionManager.invoke("bringToFront");
                },
                disabled: !selection || !selection.length
            },
            {
                name: "Send to Back",
                icon: "send-to-back",
                callback: function () {
                    actionManager.invoke("sendToBack");
                },
                disabled: !selection || !selection.length
            },
            {
                name: "Bring Forward",
                icon: "bring-forward",
                callback: function () {
                    actionManager.invoke("bringForward");
                },
                disabled: !selection || !selection.length
            },
            {
                name: "Send Backward",
                icon: "send-backward",
                callback: function () {
                    actionManager.invoke("sendBackward");
                },
                disabled: !selection || !selection.length
            }
        ]
    });

    items.push({
        name: "Assets",
        items: [
            {
                name: "Convert to asset",
                image: "",
                callback: function () {
                    actionManager.invoke("createTemplate");
                },
                disabled: !selection || !selection.length || !selectComposite.allHaveSameParent()
            },
            {
                name: "Edit asset",
                image: "",
                callback: function () {
                    actionManager.invoke("editTemplate");
                },
                disabled: !selection || selection.length !== 1
                //|| !(selection[0] instanceof fwk.TemplatedElement)
                //|| (selection[0].system() && !DEBUG)
            },
            {
                name: "Convert to elements",
                image: "",
                callback: function () {
                    actionManager.invoke("decomposeTemplate");
                },
                disabled: !selection || selection.length !== 1 /*|| !(selection[0] instanceof fwk.TemplatedElement)*/
            }
        ]
    });

}

function onDefaultFamilyChanged(event) {
    if (event.oldValue === event.newValue) {
        return;
    }

    fwk.Font.familyOverride = event.newValue;
    var app = App.Current;

    if (app.isLoaded) {
        var res = confirm("Would you like to update font family on all stencils in the project?");
        if (res) {
            each(app.pages, function (page) {
                page.applyVisitor(function (element) {
                    if (element.props.font) {
                        var oldFont = element.props.font;
                        var newFont = fwk.Font.extend(oldFont, {family: event.newValue});
                        element.setProps({font: newFont});
                        app.raiseLogEvent(Primitive.element_props_change(element, newFont, oldFont));
                    }
                }, false);
            });
        }

        Invalidate.request();
        //TODO: change toolbox
    }
}


class App extends DataNode {
    constructor() {
        super(true);
        this.viewMode = "view"; //?
        this.activePage = NullPage;
        this._companyId = '';
        this._syncBroken = false;
        this._folderId = 0;
        this.isLoaded = false;
        this._allowSelection = true;
        this.loadedProjects = [];
        this._isOffline = false;
        this._mode = "edit";
        this.styleManager = StyleManager;
        var that = this;

        //events
        this.pageAdded = fwk.EventHelper.createEvent();
        this.pageRemoved = fwk.EventHelper.createEvent();
        this.pageChanged = fwk.EventHelper.createEvent();
        this.pageChanging = fwk.EventHelper.createEvent();
        this.loadedFromJson = fwk.EventHelper.createEvent();
        this.savedToJson = fwk.EventHelper.createEvent();


        this.loaded = new Promise(function (resolve, reject) {
            that.loadedResolve = resolve;
        });
        this.loadedLevel1 = new Promise(function (resolve, reject) {
            that.loadedLevel1Resolve = resolve;
        });

        this.reloaded = fwk.EventHelper.createEvent();
        this.restoredLocally = fwk.EventHelper.createEvent();
        this.selectionMade = fwk.EventHelper.createEvent();
        this.onBuildMenu = fwk.EventHelper.createEvent();
        this.offlineModeChanged = fwk.EventHelper.createEvent();

        this.modeChanged = fwk.EventHelper.createEvent();

        //deprecate
        this.logEvent = fwk.EventHelper.createEvent();


        this.changed = fwk.EventHelper.createEvent();
        this.changedLocally = fwk.EventHelper.createEvent();
        this.changedExternally = fwk.EventHelper.createEvent();

        this.storyInserted = fwk.EventHelper.createEvent();
        this.storyRemoved = fwk.EventHelper.createEvent();
        this.activeStoryChanged = fwk.EventHelper.createEvent();

        this.onBuildMenu.bind(this, onBuildDefaultMenu);

        this._userSettings = JSON.parse(localStorage["_userSettings"] || '{}');

        this.container = new DependencyContainer();
        this.container.app = this;
        this.migrationUpgradeNotifications = [];

        this.platform = platform;
        this.resources = fwk.Resources;

        this.primitiveRootCache = {};
        this.modelSyncProxy = new ModelSyncProxy(this);

        this.state = new AppState(this);
        this.offlineModel = new OfflineModel();

    }

    activeStory(value) {
        if (arguments.length > 0) {
            this._activeStory = value;
            this.activeStoryChanged.raise();
            Invalidate.requestUpperOnly();
        }

        return this._activeStory;
    }

    resetRuntimeProps() {
        this.runtimeProps = {};
    }

    propsUpdated(props, oldProps) {
        if (props.layoutGridStyle) {
            LayoutGridLines.setDefaultStrokeHsl(props.layoutGridStyle.hsl);
            LayoutGridLines.setDefaultOpacity(props.layoutGridStyle.opacity);

            LayoutGridColumns.setDefaultFillHsl(props.layoutGridStyle.hsl);
            LayoutGridColumns.setDefaultOpacity(props.layoutGridStyle.opacity);
        }
        if (props.customGuides) {
            CustomGuides.setDefaultStrokeHsl(props.customGuides.hsl);
            CustomGuides.setDefaultOpacity(props.customGuides.opacity);
        }

        DataNode.prototype.propsUpdated.apply(this, arguments);
    }

    propsPatched(patchType, propName, item) {
        var isStyles = propName === "styles";
        var isTextStyles = propName === "textStyles";
        if (isStyles || isTextStyles) {
            var type = isStyles ? 1 : 2;
            switch (patchType) {
                case PatchType.Change:
                    StyleManager.updateStyle(item.id, type, item.props);
                    break;
                case PatchType.Remove:
                    StyleManager.deleteStyle(item.id, type);
                    break;
                //Insert handled through StyleManager already
            }
        }

        if (propName === "dataProviders") {
            switch (patchType) {
                case PatchType.Insert:
                case PatchType.Change:
                    DataManager.registerProvider(item.id, CustomDataProvider.fromJSON(item));
                    break;
                case PatchType.Remove:
                    DataManager.registerProvider(item.id);
                    break;
            }
        }

        DataNode.prototype.propsPatched.apply(this, arguments);
    }

    updateStyle(type, styleId, props) {
        var styleProp = StyleManager.getPropNameForType(type);
        var style = StyleManager.getStyle(styleId, type);
        var newStyle = Object.assign({}, style);
        Object.assign(newStyle.props, props);

        this.applyVisitorDepthFirst(function (x) {
            if (x.props[styleProp] === styleId) {
                x.setProps(newStyle.props);
            }
        });

        this.patchProps(PatchType.Change, type === 1 ? "styles" : "textStyles", newStyle);
    }

    syncBroken(value) {
        if (arguments.length === 1) {
            this._syncBroken = value;
        }
        return this._syncBroken;
    }

    isInOfflineMode(value) {
        if (value !== undefined) {
            if (value) {
                value = false;
            }
            var raiseEvent = this._isOffline !== value;
            this._isOffline = value;
            if (raiseEvent) {
                if (value) {
                    this.timeWentOffline = new Date();
                }
                else {
                    this.timeWentOnline = new Date();
                }
                this.raiseLogEvent(value ? fwk.sync.Primitive.app_offline() : fwk.sync.Primitive.app_online());
                this.offlineModeChanged.raise();
            }
        }
        return this._isOffline;
    }

    loadRef(value) {
        if (arguments.length === 1){
            this.runtimeProps.loadRef = value;
        }
        return this.runtimeProps.loadRef || 0;
    }

    releaseLoadRef() {
        this.loadRef(this.loadRef() - 1);
    }

    addLoadRef() {
        this.loadRef(this.loadRef() + 1);
    }

    unload() {
        this.clear();
        this.isLoaded = false;
    }

    clear() {
        //TODO: do we still need the events for removing pages?
        this.children = [];
        this.setActivePage(NullPage);
    }

    applyVisitor(callback) {
        each(this.pages, function (page) {
            page.applyVisitor(element=> {
                if (callback(element, page) === false) {
                    return false;
                }
            }, false);
        });
    }

    addPage(page) {
        this.insertChild(page, this.children.length);

        if (!page.isInitialized()) {
            if (page.screenType && !page.screenType()) {
                page.screenType(this.project.defaultScreenType)
            }
            page.initPage(Environment.view);
            page._placeBeforeRender = true;
        }

        this.pageAdded.raise(page);
        Invalidate.request();

        if (this.activePage === NullPage) {
            this.setActivePage(page);
        }
    }

    //TODO: if primitives call dataNode.insertChild, this is not needed
    insert(element, index, mode) {
        this.insertChild(element, index, mode);
    }

    //TODO: if primitives call dataNode.insertChild, this is not needed
    remove(element) {
        this.removeChild(element);
    }

    activePageToDataURL(type) {
        return Environment.view.toDataURL(type);
    }

    primitiveRoot() {
        return this;
    }

    primitivePath() {
        var path = this.runtimeProps.primitivePath;
        if (!path) {
            path = [];
            this.runtimeProps.primitivePath = path;
        }
        return path;
    }

    removePage(page, setNewActive) {
        if (!page) {
            return;
        }
        setNewActive = (setNewActive === undefined) ? true : setNewActive;
        var indexOfRemoved = this.pages.indexOf(page);

        if (setNewActive && page === this.activePage) {
            var newActive = this.pages[indexOfRemoved + 1];
            if (!newActive) {
                newActive = this.pages[indexOfRemoved - 1];
            }
            if (newActive) {
                this.setActivePage(newActive);
            }
        }

        this.removeChild(page);
        this.pageRemoved.raise(page);

        return -1;
    }

    duplicatePageById(pageId) {
        var page = this.getPageById(pageId);
        var newPage = page.clone();
        newPage.initId();
        newPage.name("Copy of " + page.name());
        this.addPage(newPage);
    }

    eachDesignerPage(callback) {
        var pages = this.pages;
        each(pages, function (p) {
            if (p.isDesignerPage()) {
                return callback(p);
            }
        });
    }

    toJSON(pageIdMap) {
        var json = {
            t: this.t,
            children: [],
            props: this.props,
            styles: this.styleManager.getStyles(1),
            textStyles: this.styleManager.getStyles(2)
        };

        this.eachDesignerPage(function (page) {
            var include = true;
            if (pageIdMap) {
                include = pageIdMap[page.id()];
            }
            if (include) {
                var pageData = page.toJSON();
                if (pageData) {
                    json.children.push(pageData);
                }
            }
        });

        var includeResources = true;
        if (pageIdMap) {
            includeResources = pageIdMap['resources'];
        }
        if (includeResources) {
            json.props.resources = fwk.Resources.toJSON();
        }

        this.savedToJson.raise(json);

        return json;
    }

    fromJSON(data) {
        ModelStateListener.stop();
        var that = this;
        that.clear();

        this.setProps(data.props);
        fwk.Resources.fromJSON(data.props.resources);

        if (this.props.styles) {
            for (let i = 0; i < this.props.styles.length; ++i) {
                let style = this.props.styles[i];
                StyleManager.registerStyle(style, 1);
            }
        }

        if (this.props.textStyles) {
            for (let i = 0; i < this.props.textStyles.length; ++i) {
                let style = this.props.textStyles[i];
                StyleManager.registerStyle(style, 2);
            }
        }

        if (this.props.dataProviders) {
            for (let i = 0; i < this.props.dataProviders.length; ++i) {
                let provider = this.props.dataProviders[i];
                DataManager.registerProvider(provider.id, CustomDataProvider.fromJSON(provider));
            }
        }

        for (let i = 0; i < data.children.length; i++) {
            var pageData = data.children[i];
            var page = fwk.UIElement.fromJSON(pageData);
            this.addPage(page);

        }
        ModelStateListener.start();
    }

    serverless(value) {
        if (arguments.length === 1) {
            this.setProps({serverless: value}, ChangeMode.Self);
        }
        return this.props.serverless;
    }

    defaultShapeSettings(value) {
        if (arguments.length === 1) {
            this.setProps({defaultShapeSettings: value});
        }
        return this.props.defaultShapeSettings;
    }

    defaultLineSettings(value) {
        if (arguments.length === 1) {
            this.setProps({defaultLineSettings: value});
        }
        return this.props.defaultLineSettings;
    }

    nextPageId() {
        return createUUID();
    }

    setCurrentTool(tool) {
        this.currentTool = tool;
    }

    allowSelection(value) {
        if (value != undefined) {
            this._allowSelection = value;
        }
        return this._allowSelection;
    }

    version(value) {
        if (arguments.length === 1) {
            this.setProps({editVersion: value}, ChangeMode.Self);
        }
        return this.props.editVersion;
    }

    companyId(value) {
        if (arguments.length === 1) {
            this._companyId = value;
        }
        return this._companyId;
    }

    name(value) {
        if (arguments.length === 1) {
            this.setProps({name: value});
        }
        return this.props.name;
    }

    folderId(value) {
        if (arguments.length === 1) {
            this._folderId = value;
        }
        return this._folderId;
    }

    userValue(name, value) {
        if (arguments.length > 1) {
            this._userSettings[name] = value;
            localStorage["_userSettings"] = JSON.stringify(this._userSettings);
        }
        return this._userSettings[name];
    }

    detachExtensions() {
        if (this._extensions && this._extensions.length) {
            for (var i = 0; i < this._extensions.length; ++i) {
                this._extensions[i].detach();
            }
        }
        this._extensions = null;
    }

    initExtensions() {
        this._extensions = [];
        for (var i = 0, l = extensions.length; i < l; ++i) {
            var Extension = extensions[i];

            this._extensions.push(new Extension(this, Environment.view, Environment.controller));
        }
    }

    //TODO: rethink the concept of run method for better testability
    run() {
        var that = this;
        this.clear();

        //this.setProps(defaultAppProps);

        Environment.detaching.bind(this, ()=> {
            this.detachExtensions();
        });

        Environment.attached.bind(this, ()=> {
            this.initExtensions();
        });

        this.platform.run(this);

        this.actionManager = actionManager;

        this.setupView();

        this.actionManager.registerApp(this);

        var stopwatch = new Stopwatch("AppLoad", true);
        that.platform.setupConnection(that);

        var projectLoaded = that.loadMainProject();
        var fontsLoaded = that.waitForWebFonts();
        var dataLoaded = that.loadData();

        return Promise.all([dataLoaded, projectLoaded, fontsLoaded]).then(function (result) {
            var data = result[0];
            stopwatch.checkpoint("DataProjectFonts");
            that.initExtensions();
            if (that.platform.richUI()) {
                actionManager.invoke("movePointer");
            }

            var fontPromises = that.loadFonts(data);

            if (data) {
                that.fromJSON(data);
                stopwatch.checkpoint("FromJson");
            }

            return Promise.all(fontPromises).then(function () {
                stopwatch.checkpoint("FontPromises");

                logger.trackEvent("AppLoaded", null, stopwatch.getMetrics());

                that.platform.initViewManager();

                that.raiseLoaded();
                //this method depends on extensions (comments) being initialized
                that.platform.postLoad(that);

                that.releaseLoadRef();

                //that.platform.ensureCanvasSize();

                backend.enableLoginTimer();
            });
        }).catch(function (e) {
            logger.trackEvent("App not loaded", {logLevel: "fatal", error: e});
            throw e;
        });
    }

    raiseLoaded() {
        //TODO: there are multiple dependencies between various components and extensions (master pages and app state, mvvm and comments).
        // not sure what is the most graceful way to handle them.
        // what if we have load levels like in *nix?
        var that = this;
        this.loadedLevel1Resolve();
        this.loadedLevel1.then(function () {
            that.loadedResolve();
            that.isLoaded = true;
            that.onLoaded();
        }).catch(function (error) {
            console.error(error);
        });

        this.loaded.catch(function (error) {
            console.error(error);
        });
    }

    onLoaded() {
    }

    raiseLogEvent(primitive, disableMultiple) {
        if (!primitive) {
            return;
        }
        if (primitive instanceof Array) {
            for (var i = 0; i < primitive.length; ++i) {
                this.raiseLogEvent(primitive[i]);
            }
            return;
        }

        if (!disableMultiple) {
            if (this.migrationUpgradeNotifications.length) {
                for (var i = 0, l = this.migrationUpgradeNotifications.length; i < l; ++i) {
                    var element = this.migrationUpgradeNotifications[i];
                    var page = element.page(); // workaround for tables in assets and composites
                    if (page) {
                        var p = Primitive.element_change(element, page);
                        p.serverOnly = true;
                        this.raiseLogEvent(p, true);
                    }
                }
                this.migrationUpgradeNotifications = [];
            }
        }

        this.logEvent.raise(primitive);
    }

    loadData() {
        if (!this.id()) {
            return Promise.resolve();
        }
        return this.modelSyncProxy.getLatest();
    }

    loadFonts(data) {
        var fontMetadata = [];
        var fontUsage = [];
        if (data) {
            if (data.props.statistics) {
                fontMetadata = data.props.statistics.fontMetadata;
                fontUsage = data.props.statistics.fontUsage;
            }
        }

        if (!fontMetadata.find(x => x.name === OpenTypeFontManager.defaultFontMetadata[0].name)) {
            fontMetadata.push(OpenTypeFontManager.defaultFontMetadata[0]);
        }
        if (!fontUsage.find(x => x.family === OpenTypeFontManager.defaultFontMetadata[0].name
            && x.style == FontStyle.Normal
            && x.weight === FontWeight.Regular)) {
            fontUsage.push({
                family: OpenTypeFontManager.defaultFontMetadata[0].name,
                style: FontStyle.Normal,
                weight: FontWeight.Regular
            });
        }
        for (var i = 0; i < fontUsage.length; i++) {
            var usage = fontUsage[i];
            if (!usage.weight) {
                usage.weight = FontWeight.Regular;
            }
            if (!usage.style) {
                usage.style = FontStyle.Normal;
            }
        }

        return fontUsage.map(usage => {
            var metadata = fontMetadata.find(x => x.name === usage.family);
            return OpenTypeFontManager.load(metadata, usage.style, usage.weight);
        });
    }

    loadMainProject() {
        var dfd = Deferred.create();

        this.project = new WebProject();
        this.project.load(this, dfd);

        return dfd.promise();
    }

    get pages() {
        return this.children.filter(p=>p instanceof Page);
    }

    get stories() {
        return this.children.filter(p=>p instanceof Story);
    }

    isEmpty() {
        return this.children.length === 0;
    }

    getPageById(id) {
        return this.children.find(x => x.props.id === id);
    }

    findPrimitiveRoot(key) {
        var primitiveRootElementEntry = this.primitiveRootCache[key];
        var primitiveRootElement;
        if (!primitiveRootElementEntry) {
            primitiveRootElement = this.findNodeBreadthFirst(x => x.primitiveRootKey() === key);
            this.primitiveRootCache[key] = {element: primitiveRootElement, hitCount: 1}
        } else {
            primitiveRootElement = primitiveRootElementEntry.element;
            primitiveRootElementEntry.hitCount++;
        }
        return primitiveRootElement;
    }

    relayout() {
        try {
            this.relayoutInternal();
        }
        finally {
            ModelStateListener.clear();
            this.primitiveRootCache = {};
        }

    }

    relayoutInternal() {
        var roots = ModelStateListener.roots;
        var primitives = [];
        for (let i = 0; i < roots.length; ++i) {
            let key = roots[i].key;
            let primitiveRootElement = this.findPrimitiveRoot(key);
            if (primitiveRootElement === this) {
                var primitiveMap = DeferredPrimitives.releasePrimitiveMap(this);
                if (primitiveMap) {
                    var appPrimitives = primitiveMap[this.primitiveRootKey()];
                    for (let j = 0; j < appPrimitives.length; j++) {
                        PrimitiveHandler.handle(this, appPrimitives[j]);
                    }
                    Array.prototype.push.apply(primitives, appPrimitives);
                }
            }
            else if (primitiveRootElement) { // the element can be deleted
                let res = primitiveRootElement.relayout(ModelStateListener.elementsPropsCache);
                if (res !== null) {
                    Array.prototype.push.apply(primitives, res);
                }
            }
        }

        if (primitives.length) {
            this.changed.raise(primitives);
        }

        // this one should be in a separate loop, because we can get more elements after relayout
        var rollbacks = [];
        primitives = [];
        for (let i = 0; i < roots.length; ++i) {
            let key = roots[i].key;
            var rootPrimitives = roots[i].data;
            let primitiveRootElement = this.findPrimitiveRoot(key);
            if (primitiveRootElement) {
                primitiveRootElement.relayoutCompleted();
            }

            for (var j = 0; j < rootPrimitives.length; j++) {
                var p = rootPrimitives[j];
                primitives.push(p);
                rollbacks.splice(0, 0, p._rollbackData);
                delete p._rollbackData;
            }
        }

        if (primitives.length) {
            if (DEBUG) {
                primitives.forEach(x => formatPrimitive(x, debug));
            }
            CommandManager.registerExecutedCommand(new PrimitiveSetCommand(primitives, rollbacks));
            this.changedLocally.raise(primitives);
            this.changed.raise(primitives);
            Invalidate.request();
        }
    }

    relayoutCompleted() {
    }

    setActivePage(page) {
        if (!page) {
            return false;
        }
        var oldPage = this.activePage;

        if (oldPage === page) {
            return true;
        }

        if (this.actionManager) { //undefined in node
            this.actionManager.invoke('cancel');
        }

        this.pageChanging.raise(oldPage, page);

        if (oldPage) {
            if (oldPage.deactivating(page) === false) {
                return false;
            }
        }

        page.activating(oldPage);

        this.activePage = page;

        if (oldPage) {
            oldPage.deactivated();
        }

        var view = Environment.view;
        if (view) {
            view.setActivePage(page);
            view.resize(page.viewportRect());
            view.zoom(page.scale(), true);
        }

        page.activated(oldPage);

        this.pageChanged.raise(oldPage, page);
        return true;
    }

    setActivePageById(pageId) {
        var page = this.getPageById(pageId);
        this.setActivePage(page);
    }

    setupView() {
        // this.view = view;
        // this.view.setup({Layer, SelectComposite, DraggingElement, SelectFrame});
        // this.view.resize({x: 0, y: 0, width: 3000, height: 2000});
        // this.container.view = this.view;
        // Environment.setView(view)
    }

    _elementById(id) {
        var res = null;
        each(this.pages, function (container) {
            if (container.id() === id) {
                res = container;
                return false;
            }
            container.applyVisitor(function (el) {
                if (el.id() === id) {
                    res = el;
                    return true;
                }
            })

        });

        return res;
    }

    viewportSize() {
        return this.platform.viewportSize();
    }

    isNew() {
        return !this.isSaved();
    }

    isSaved() {
        return !!this.id();
    }

    displayName() {
        return _(this.t);
    }

    viewPointToScreen(point) {
        var htmlParent = $(this.platform.viewContainerElement());
        var parentOffset = htmlParent.offset();
        return {
            x: parentOffset.left + point.x - this.activePage.scrollX(),
            y: parentOffset.top + point.y - this.activePage.scrollY()
        };
    }


    getDefaultCategories() {
        return ["Editing"];
    }

    isPreviewMode() {
        return this._mode === "preview";
    }

    setMode(value) {
        if (this._mode !== value) {
            this._mode = value;

            this.modeChanged.raise(value);
        }
    }

    setPageStatus(pageId, statusId) {
        var page = this.getPageById(pageId);
        if (page.status() !== statusId) {
            page.status(statusId);
            this.raiseLogEvent(Primitive.page_status_change(pageId, statusId, fwk.Page.Statuses[statusId]));
        }
    }

    //these should be in platform, but ImageRenderer does not have any platform
    generateWebFontConfig(deferred, projectName) {
        var config = {
            custom: {
                families: []
            },
            timeout: 60 * 1000,
            active () {
                deferred.resolve();
            },
            inactive () {
                var failedFonts = this._inactiveFonts;
                if (!failedFonts) {
                    failedFonts = this.custom.families;
                }
                deferred.reject("Could not load fonts: " + failedFonts.join(", "));
            },
            fontinactive (familyName, fvd) {
                if (!this._inactiveFonts) {
                    this._inactiveFonts = [];
                }
                this._inactiveFonts.push(familyName + ":" + fvd);
            }
        };

        var project = ProjectsMetadata.projects["WebProject"];
        config.custom.families = config.custom.families.concat(project.fontsWithIcons);
        if (project.fonts) {
            for (var i in project.fonts) {
                config[i] = project.fonts[i];
            }
        }

        return config;
    }

    waitForWebFonts() {
        var deferred = Deferred.create();

        var config = this.generateWebFontConfig(deferred, sketch.params.projectType);
        WebFont.load(config);

        if (sketch.params.noWaitForWebFont) {
            deferred.resolve();
        }

        return deferred.promise();
    }

    importPage(data){
        var pageJson = data.page;
        var name = ' ('+pageJson.name+')';
        if(data.styles) {
            for (var style of data.styles) {
                style.name += name;
                StyleManager.registerStyle(style, StyleType.Visual)
            }
        }

        if(data.textStyles) {
            for (var style of data.textStyles) {
                style.name += name;
                StyleManager.registerStyle(style, StyleType.Text)
            }
        }

        var page = fwk.UIElement.fromJSON(pageJson);
        this.addPage(page);
        this.setActivePage(page);
    }

    getArtboardById(artboardId) {
        for (var i = this.pages.length - 1; i >= 0; --i) {
            var artboard = this.pages[i].getArtboardById(artboardId);
            if (artboard) {
                return artboard;
            }
        }

        return null;
    }

    shortcutsEnabled(value) {
        if (shortcut) {
            return (shortcut.active = value);
        }

        return false;
    }

    addNewPage(options) {
        return this.project.addNewPage(options);
    }

    dispose() {
        this.loadedLevel1.cancel();
        this.loaded.cancel();

        ModelStateListener.clear();
        if (this.persistentConnection){
            this.persistentConnection.stop();
        }

        if (this.platform) {
            this.platform.dispose();
            this.platform = null;
        }
        if (this.state) {
            this.state.dispose();
            this.state = null;
        }
        this.logEvent.clearSubscribers();
        this.changed.clearSubscribers();
        this.changedLocally.clearSubscribers();
        this.changedExternally.clearSubscribers();
        this.disposed = true;
    }

    addStory(props) {
        var story = new Story();
        story.setProps(props);
        this.insertChild(story, this.children.length);

        this.storyInserted.raise(story);

        if (!this.activeStory()) {
            this.activeStory(story);
        }
    }

    removeStory(story) {
        this.removeChild(story);
        this.storyRemoved.raise(story);
    }
}

App.prototype.t = Types.App;

PropertyMetadata.registerForType(App, {
    defaultShapeSettings: {
        defaultValue: Object.getPrototypeOf(PropertyMetadata.getDefaultProps(Types.DefaultShapeSettings))
    },
    defaultLineSettings: {
        defaultValue: Object.getPrototypeOf(PropertyMetadata.getDefaultProps(Types.DefaultLineSettings))
    },
    defaultTextSettings: {
        defaultValue: {
            font: Font.Default,
            textStyleName: ""
        }
    },
    layoutGridStyle: {
        defaultValue: {
            hsl: {h: 240, s: 1, l: .5},
            opacity: .2,
            show: false,
            type: "stroke"
        }
    },
    defaultLayoutGridSettings: {
        defaultValue: {
            columnsCount: 0,
            gutterWidth: 20,
            autoColumnWidth: true,
            columnWidth: undefined
        }
    },
    customGuides: {
        defaultValue: {
            hsl: CustomGuides.getDefaultStrokeHsl(),
            opacity: 1,
            show: true,
            lock: false
        }
    },
    styles: {
        defaultValue: []
    },
    textStyles: {
        defaultValue: []
    },
    dataProviders: {
        defaultValue: []
    }
});


window.App = App;

export default App;

