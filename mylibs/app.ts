import LayoutGridLines from "extensions/guides/LayoutGridLines";
import LayoutGridColumns from "extensions/guides/LayoutGridColumns";
import CustomGuides from "extensions/guides/CustomGuides";
import Brush from "./framework/Brush";
import EventHelper from "./framework/EventHelper";
import PropertyTracker from "framework/PropertyTracker";
import Page from "framework/Page";
import StyleManager from "framework/style/StyleManager";
import OpenTypeFontManager from "./OpenTypeFontManager";
import {
    Types,
    FontWeight,
    FontStyle,
    PatchType,
    ChangeMode,
    StoryType,
    StyleType,
    ArtboardResource,
    ViewTool,
    ContextBarPosition
} from "./framework/Defs";
import Font from "./framework/Font";
import GroupContainer from "./framework/GroupContainer";
import RepeatContainer from "./framework/repeater/RepeatContainer";
import CommandManager from "framework/commands/CommandManager";
import NullPage from "framework/NullPage";
import ModelStateListener from "framework/sync/ModelStateListener";
import DeferredPrimitives from "framework/sync/DeferredPrimitives";
import PrimitiveHandler from "framework/sync/Primitive_Handlers";
import PrimitiveSetCommand from "commands/PrimitiveSetCommand";
import { createUUID } from "./util";
import DesignerController from "framework/DesignerController";
import Selection from "framework/SelectionModel";
import Invalidate from "framework/Invalidate";
import Environment from "environment";
import ModelSyncProxy from "./server/ModelSyncProxy";
import DataNode from "./framework/DataNode";
import DataManager from "./framework/data/DataManager";
import CustomDataProvider from "./framework/data/CustomDataProvider";
import AppState from "./AppState";
import OfflineModel from "./offline/OfflineModel";
import Deferred from "framework/Deferred";
import Story from "stories/Story";
import UserSettings from "./UserSettings";
import ObjectFactory from "./framework/ObjectFactory";
import ActionManager from "./ui/ActionManager";
import ShortcutManager from "./ui/ShortcutManager";
import logger from "./logger";
import { IApp, IEvent } from "carbon-core";
import { IPage } from "carbon-model";

window['env'] = Environment;
window['Selection'] = Selection;

var debug = require("./DebugUtil")("carb:relayout");

var backend = require("backend");
var platform = require("platform/Platform");
var DependencyContainer = require("DependencyContainer");
var NullContainer = require("framework/NullContainer");
var Primitive = require("framework/sync/Primitive");
var Layer = require("framework/Layer");
var SelectComposite = require("framework/SelectComposite");
var SelectFrame = require("framework/SelectFrame");
var extensions = require("extensions/All");
var ProjectsMetadata = require("projects/Metadata");
var domUtil = require("utils/dom");
var Stopwatch = require("./Stopwatch");
var WebFont = require("webfontloader");
var PropertyMetadata = require("framework/PropertyMetadata");
var WebProject = require("./projects/WebProject");
var Path = require("./ui/common/Path");
var CompoundPath = require("./ui/common/CompoundPath");

// using
var ui = window['sketch'].ui,
    fwk = window['sketch'].framework,
    sync = fwk.sync;

var addComment = function (event) {
    var scale = Environment.view.scale();
    fwk.pubSub.publishSync("comment.addFromMenu", {
        x: ~~(domUtil.layerX(event) / scale),
        y: ~~(domUtil.layerY(event) / scale)
    });
};

class AppClass extends DataNode implements IApp {
    [name: string]: any;
    isLoaded: boolean;
    activePage: IPage;

    shortcutManager: ShortcutManager;
    actionManager: ActionManager;

    onBuildMenu: IEvent<{ a: number }>;

    currentToolChanged: IEvent<string>;
    _currentTool: string;

    constructor() {
        super(true);

        this._disposables = [];
        this.viewMode = "view"; //?
        this.activePage = NullPage;
        this._companyId = "";
        this.props.id = "";
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
        this.pageAdded = EventHelper.createEvent();
        this.pageRemoved = EventHelper.createEvent();
        this.pageChanged = EventHelper.createEvent();
        this.pageChanging = EventHelper.createEvent();
        this.loadedFromJson = EventHelper.createEvent();
        this.savedToJson = EventHelper.createEvent();


        this.changeToolboxPage = EventHelper.createEvent();

        this.loaded = new Promise(function (resolve, reject) {
            that.loadedResolve = resolve;
        });
        this.loadedLevel1 = new Promise(function (resolve, reject) {
            that.loadedLevel1Resolve = resolve;
        });

        this.reloaded = EventHelper.createEvent();
        this.restoredLocally = EventHelper.createEvent();
        this.selectionMade = EventHelper.createEvent();
        this.onBuildMenu = EventHelper.createEvent();
        this.offlineModeChanged = EventHelper.createEvent();

        this.modeChanged = EventHelper.createEvent();

        this.resourceChanged = EventHelper.createEvent();

        //deprecate
        this.logEvent = EventHelper.createEvent();


        this.changed = EventHelper.createEvent();
        this.changedLocally = EventHelper.createEvent();
        this.changedExternally = EventHelper.createEvent();

        this.storyInserted = EventHelper.createEvent();
        this.storyRemoved = EventHelper.createEvent();
        this.activeStoryChanged = EventHelper.createEvent();

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

        this.actionManager = new ActionManager(this);
        this.actionManager.registerActions();

        this.shortcutManager = new ShortcutManager();
        this.shortcutManager.mapDefaultScheme();

        this._currentTool = ViewTool.Pointer;
        this.currentToolChanged = EventHelper.createEvent();

        var token = Selection.onElementSelected.bind((selection, oldSelection, doNotTrack)=>{
            let selectionIds = Selection.selectedElements().map(e=>e.id());
            let oldSelectionIds = oldSelection.map(e=>e.id());
            if(!doNotTrack && (selectionIds.length || oldSelectionIds.length)) {
                ModelStateListener.trackSelect(
                    this.activePage,
                    selectionIds,
                    oldSelectionIds,
                    this.userId());
            }
        });
        this.registerForDisposal(token);

        this.fontManager = new OpenTypeFontManager();
        this.fontManager.registerAsDefault();

        this.dataManager = new DataManager();
    }

    userId() {
        return backend.getUserId();
    }

    activeStory(value) {
        if (arguments.length > 0) {
            this._activeStory = value;
            this.activeStoryChanged.raise(value);
            Invalidate.requestUpperOnly();
        }

        return this._activeStory;
    }

    getAllFrames() {
        var res = [];
        for (var i = 0; i < this.pages.length; ++i) {
            var page = this.pages[i];
            var artboards = page.getAllArtboards();
            for (var j = 0; j < artboards.length; ++j) {
                var a = artboards[j];
                if (a.props.resource === ArtboardResource.Frame) {
                    res.push(a);
                }
            }
        }

        return res;
    }


    getAllPalettes() {
        var res = [];
        for (var i = 0; i < this.pages.length; ++i) {
            var page = this.pages[i];
            var artboards = page.getAllArtboards();
            for (var j = 0; j < artboards.length; ++j) {
                var a = artboards[j];
                if (a.props.resource === ArtboardResource.Palette) {
                    res.push(a);
                }
            }
        }

        return res;
    }

    getAllTemplateResourceArtboards() {
        var res = [];
        for (var i = 0; i < this.pages.length; ++i) {
            var page = this.pages[i];
            var children = [];
            var artboards = page.getAllArtboards();
            for (var j = 0; j < artboards.length; ++j) {
                var a = artboards[j];
                if (a.props.resource === ArtboardResource.Template) {
                    children.push(a);
                }
            }
            if (children.length > 0) {
                res.push({ name: page.name(), id: page.id(), children: children })
            }
        }

        return res;
    }

    resetRuntimeProps() {
        this.runtimeProps = {};
    }

    propsUpdated(props, oldProps, mode) {
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

        if (mode === ChangeMode.Self && props.defaultShapeSettings){
            //if restoring from primitives or from server data
            ObjectFactory.updatePropsWithPrototype(props.defaultShapeSettings);
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
                    this.dataManager.registerProvider(item.id, CustomDataProvider.fromJSON(item));
                    break;
                case PatchType.Remove:
                    this.dataManager.registerProvider(item.id);
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

    setMirrorArtboardId(pageId, artboardId) {
        this._setUserSetting("mirrorPageId", pageId);
        this._setUserSetting("mirrorArtboardId", artboardId);
    }

    mirroringCode(value) {
        if(arguments.length !== 0) {
            this._setUserSetting("mirroringCode", value);
        }

        return this._getUserSetting("mirroringCode")
    }

    loadFont(family, style, weight): Promise<void>{
        return this.fontManager.load(family, style, weight);
    }

    saveFontMetadata(metadata){
        if (this.fontManager.tryAddMetadata(metadata)){
            var metadataWithId = Object.assign({}, metadata);
            metadataWithId.id = metadata.name;
            this.patchProps(PatchType.Insert, "fontMetadata", metadataWithId);
        }
    }

    getFontMetadata(family){
        return this.fontManager.getMetadata(family);
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
        if (arguments.length === 1) {
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

    isElectron() {
        return window && window.process && window.process.type === 'renderer';
    }

    applyVisitor(callback) {
        each(this.pages, function (page) {
            page.applyVisitor(element => {
                if (callback(element, page) === false) {
                    return false;
                }
            }, false);
        });
    }

    addPage(page) {
        this.insertChild(page, this.children.length);
        this.initPage(page);
    }

    initPage(page) {
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
        // TODO: do not materialize, to clone
        var page = DataNode.getImmediateChildById(this, pageId, true);
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

    toJSON(pageIdMap?:any) {
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
        that.clear()

        this.setProps(data.props, ChangeMode.Self);
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
                this.dataManager.registerProvider(provider.id, CustomDataProvider.fromJSON(provider));
            }
        }

        this.children = data.children;

        for (let i = 0; i < this.children.length; i++) {
            var rawData = data.children[i];
            var item = ObjectFactory.getObject(rawData);
            data.children[i] = item;
            if (item instanceof Page) {
                this.initPage(item);
            } else if (item instanceof Story) {
                this.initStory(item);
            }
        }

        ModelStateListener.start();
        return this;
    }

    serverless(value) {
        if (arguments.length === 1) {
            this.setProps({ serverless: value }, ChangeMode.Self);
        }
        return this.props.serverless;
    }

    defaultShapeSettings(value, mode) {
        if (arguments.length) {
            this.setProps({ defaultShapeSettings: value }, mode);
        }
        return this.props.defaultShapeSettings;
    }

    defaultFill(value, mode) {
        if (arguments.length) {
            var settings = Object.assign({}, this.defaultShapeSettings(), { fill: value });
            this.defaultShapeSettings(settings, mode);
        }

        return this.defaultShapeSettings().fill;
    }
    defaultStroke(value, mode) {
        if (arguments.length) {
            var settings = Object.assign({}, this.defaultShapeSettings(), { stroke: value });
            this.defaultShapeSettings(settings, mode);
        }

        return this.defaultShapeSettings().stroke;
    }

    recentColors() {
        return this.props.recentColors;
    }

    useRecentColor(color) {
        var colors = this.props.recentColors.slice();
        for (var i = 0; i < colors.length; ++i) {
            if (colors[i] == color) {
                colors.splice(i, 1);
            }
        }
        colors.splice(0, 0, color);
        if (colors.length > 10) {
            colors.splice(colors.length - 1, 1);
        }

        this.setProps({ recentColors: colors });
    }

    defaultLineSettings(value) {
        if (arguments.length === 1) {
            this.setProps({ defaultLineSettings: value });
        }
        return this.props.defaultLineSettings;
    }

    snapSettings(value) {
        if (arguments.length === 1) {
            this._setUserSetting("snapTo", value);
            return value;
        }
        return this._getUserSetting("snapTo", UserSettings.snapTo);
    }

    _getUserSetting(name, defaultValue) {
        var userId = backend.getUserId();

        return this._getSpecificUserSetting(userId, name, defaultValue);
    }

    _getSpecificUserSetting(userId, name, defaultValue) {
        for (var i = 0; i < this.props.userSettings.length; i++) {
            var s = this.props.userSettings[i];
            if (s.id.startsWith(userId) && s.id.split(":")[1] === name) {
                return s.value;
            }
        }

        return defaultValue;
    }
    _setUserSetting(name, value) {
        var fullName = backend.getUserId() + ":" + name;
        var oldValue = this._getUserSetting(name);
        if(value === null) {
            this.patchProps(PatchType.Remove, "userSettings", { id: fullName });
        } else {
            this.patchProps((oldValue === null || oldValue === undefined) ? PatchType.Insert : PatchType.Change, "userSettings", { id: fullName, value });
        }
    }

    nextPageId() {
        return createUUID();
    }

    allowSelection(value) {
        if (value != undefined) {
            this._allowSelection = value;
        }
        return this._allowSelection;
    }

    version(value) {
        if (arguments.length === 1) {
            this.setProps({ editVersion: value }, ChangeMode.Self);
        }
        return this.props.editVersion;
    }

    showFrames(value) {
        if (arguments.length === 1) {
            this.setProps({ showFrames: value });
        }
        return this.props.showFrames;
    }

    companyId(value) {
        if (arguments.length === 1) {
            this._companyId = value;
        }
        return this._companyId;
    }

    name(value) {
        if (arguments.length === 1) {
            this.setProps({ name: value });
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

    init() {
        Environment.detaching.bind(this, () => {
            this.detachExtensions();
        });

        Environment.attached.bind(this, () => {
            this.initExtensions();
        });

        this.platform.run(this);

        this.setupView();
    }

    //TODO: rethink the concept of run method for better testability
    run() {
        this.clear();

        backend.init(logger);

        //this.setProps(defaultAppProps);

        this.init();

        var stopwatch = new Stopwatch("AppLoad", true);
        this.platform.setupConnection(this);

        var projectLoaded = this.loadMainProject();
        var iconFontsLoaded = this.waitForWebFonts();
        var defaultFontLoaded = this.fontManager.loadDefaultFont();
        var dataLoaded = this.loadData();

        return Promise.all([dataLoaded, projectLoaded, iconFontsLoaded, defaultFontLoaded]).then(result => {
            var data = result[0];
            stopwatch.checkpoint("DataProjectFonts");
            this.initExtensions();
            if (this.platform.richUI()) {
                this.resetCurrentTool();
            }

            if (data) {
                this.fromJSON(data);
                stopwatch.checkpoint("FromJson");
            }

            this.fontManager.appendMetadata(this.props.fontMetadata);

            logger.trackEvent("AppLoaded", null, stopwatch.getMetrics());

            if (this.serverless()) {
                this.id("serverless");
            }

            this.raiseLoaded();
            //this method depends on extensions (comments) being initialized
            this.platform.postLoad(this);

            this.restoreWorkspaceState();
            this.releaseLoadRef();

            //that.platform.ensureCanvasSize();

            backend.enableLoginTimer();
        }).catch(function (e) {
            logger.trackEvent("App not loaded", { logLevel: "fatal", error: e });
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

    loadMainProject() {
        var dfd = Deferred.create();

        this.project = new WebProject();
        this.project.load(this, dfd);

        return dfd.promise();
    }

    get pages(): IPage[] {
        return (this.children as any).filter(p => p instanceof Page);
    }

    get stories() {
        return this.children.filter(p => p instanceof Story);
    }

    isEmpty() {
        return this.children.length === 0;
    }

    findPrimitiveRoot(key) {
        var primitiveRootElementEntry = this.primitiveRootCache[key];
        var primitiveRootElement;
        if (!primitiveRootElementEntry) {
            primitiveRootElement = this.findNodeBreadthFirst(x => x.primitiveRootKey() === key);
            this.primitiveRootCache[key] = { element: primitiveRootElement, hitCount: 1 }
        } else {
            primitiveRootElement = primitiveRootElementEntry.element;
            primitiveRootElementEntry.hitCount++;
        }
        return primitiveRootElement;
    }

    _trackViewPrimitive() {
        if(!ModelStateListener.roots.length) {
            return;
        }
        var trackundo = !!this._lastRelayoutView;
        var sx = this.activePage.scrollX();
        var sy = this.activePage.scrollY();
        var scale = Environment.view.scale();
        if(!trackundo) {
            this._lastRelayoutView = {};
        }
        if(trackundo && (sx !== this._lastRelayoutView.sx ||
            sy !== this._lastRelayoutView.sy ||
            scale !== this._lastRelayoutView.scale)) {

            return ModelStateListener.createViewPrimitive(this.activePage,
                sx, sy, scale,
                this._lastRelayoutView.sx,
                this._lastRelayoutView.sy,
                this._lastRelayoutView.scale
            );
        }

        this._lastRelayoutView.sx = sx;
        this._lastRelayoutView.sy = sy;
        this._lastRelayoutView.scale = scale;

        return null;
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

        ModelStateListener.markRelayoutCompleted();

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
                primitives.forEach(x => debug('Created %p %o', x, x));
            }

            var viewPrimitive = this._trackViewPrimitive();

            if(viewPrimitive){
                primitives.push(viewPrimitive);
                rollbacks.push(viewPrimitive);
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
            //view.resize(page.viewportRect());
            view.zoom(page.scale(), true);
        }

        page.activated(oldPage);

        this.pageChanged.raise(oldPage, page);
        return true;
    }

    setActivePageById(pageId) {
        var page = DataNode.getImmediateChildById(this, pageId, true);
        this.setActivePage(page);
    }

    setActiveStoryById(storyId) {
        var story = DataNode.getImmediateChildById(this, storyId, true);
        this.activeStory(story);
    }

    setupView() {
        // this.view = view;
        // this.view.setup({Layer, SelectComposite, DraggingElement, SelectFrame});
        // this.view.resize({x: 0, y: 0, width: 3000, height: 2000});
        // this.container.view = this.view;
        // Environment.setView(view)
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

    // setPageStatus(pageId, statusId) {
    //     var page = this.getPageById(pageId);
    //     if (page.status() !== statusId) {
    //         page.status(statusId);
    //         this.raiseLogEvent(Primitive.page_status_change(pageId, statusId, fwk.Page.Statuses[statusId]));
    //     }
    // }

    //these should be in platform, but ImageRenderer does not have any platform
    generateWebFontConfig(deferred, projectName) {
        var config = {
            custom: {
                families: []
            },
            timeout: 60 * 1000,
            active() {
                deferred.resolve();
            },
            inactive() {
                var failedFonts = this._inactiveFonts;
                if (!failedFonts) {
                    failedFonts = this.custom.families;
                }
                deferred.reject("Could not load fonts: " + failedFonts.join(", "));
            },
            fontinactive(familyName, fvd) {
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

    importPage(data) {
        var pageJson = data.page;
        var name = ' (' + pageJson.name + ')';
        if (data.styles) {
            for (var style of data.styles) {
                style.name += name;
                StyleManager.registerStyle(style, StyleType.Visual)
            }
        }

        if (data.textStyles) {
            for (var style of data.textStyles) {
                style.name += name;
                StyleManager.registerStyle(style, StyleType.Text)
            }
        }

        if (data.fontMetadata){
            for (var metadata of data.fontMetadata){
                this.saveFontMetadata(metadata);
            }
        }

        var i = this.children.length;
        this.children.push(pageJson);

        var page = ObjectFactory.getObject(pageJson);

        this.children[i] = page;
        this.initPage(page);
        this.setActivePage(page);

        ModelStateListener.trackInsert(this, this, page, i);

        return page;
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

    registerForDisposal(d){
        this._disposables.push(d);
    }

    dispose() {
        this.loadedLevel1.cancel();
        this.loaded.cancel();

        ModelStateListener.clear();
        if (this.persistentConnection) {
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
        if (this.dataManager){
            this.dataManager.dispose();
            this.dataManager = null;
        }

        this.logEvent.clearSubscribers();
        this.changed.clearSubscribers();
        this.changedLocally.clearSubscribers();
        this.changedExternally.clearSubscribers();

        this._disposables.forEach(x => x.dispose());
        this._disposables.length = 0;

        this.disposed = true;
    }

    addStory(props) {
        var story = new Story();
        story.setProps(props);
        this.insertChild(story, this.children.length);
        this.initStory(story);
    }

    initStory(story) {
        this.storyInserted.raise(story);

        if (!this.activeStory()) {
            this.activeStory(story);
        }
    }

    removeStory(story) {
        this.removeChild(story);
        this.storyRemoved.raise(story);
    }

    saveWorkspaceState(): void {
        var state = {
            scale: Environment.view.scale(),
            scrollX: Environment.view.scrollX(),
            scrollY: Environment.view.scrollY(),
            pageId: this.activePage.id(),
            pageState: this.activePage.saveWorkspaceState(),
            selection: Selection.selectedElements().map(x => x.id())
        };
        localStorage.setItem("workspace:" + this.id(), JSON.stringify(state));
    }
    restoreWorkspaceState(): void {
        try {
            var data = localStorage.getItem("workspace:" + this.id());
            if(!data) {
                return;
            }

            var state = JSON.parse(data);
            if(!state) {
                return;
            }

            var page = this.pages.find(x => x.id() === state.pageId);
            if (page) {
                this.setActivePage(page);
            }

            Environment.view.scale(state.scale);
            Environment.view.scrollX(state.scrollX);
            Environment.view.scrollY(state.scrollY);

            if (page && state.pageState) {
                page.restoreWorkspaceState(state.pageState);
            }

            if (state.selection.length) {
                var elements = this.activePage.findAllNodesDepthFirst(x => state.selection.indexOf(x.id()) !== -1);
                if (elements.length) {
                    Selection.makeSelection(elements);
                }
            }
        }
        catch (e) {
            //ignore
        }
    }

    get currentTool(): string {
        return this._currentTool;
    }

    set currentTool(tool: string) {
        var old = this._currentTool;
        this._currentTool = tool;
        if (old !== tool) {
            this.currentToolChanged.raise(tool);
        }
    }

    resetCurrentTool() {
        this.actionManager.invoke(ViewTool.Pointer);
    }
}

AppClass.prototype.t = Types.App;

PropertyMetadata.registerForType(AppClass, {
    showFrames: {
        defaultValue: true
    },
    defaultLineSettings: {
        defaultValue: PropertyMetadata.getDefaultProps(Types.DefaultLineSettings)
    },
    defaultTextSettings: {
        defaultValue: {
            font: Font.Default,
            textStyleName: ""
        }
    },
    layoutGridStyle: {
        defaultValue: {
            hsl: { h: 240, s: 1, l: .5 },
            opacity: .2,
            show: false,
            type: "stroke"
        }
    },
    defaultShapeSettings: {
        defaultValue: {
            fill: Brush.createFromColor(UserSettings.shapes.defaultFill),
            stroke: Brush.createFromColor(UserSettings.shapes.defaultStroke)
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
    recentColors: {
        defaultValue: []
    },
    styles: {
        defaultValue: []
    },
    textStyles: {
        defaultValue: []
    },
    dataProviders: {
        defaultValue: []
    },
    userSettings: {
        defaultValue: []
    },
    fontMetadata: {
        defaultValue: []
    }
});


window['App'] = AppClass;

export default AppClass;