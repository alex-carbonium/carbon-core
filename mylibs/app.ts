import LayoutGridLines from "extensions/guides/LayoutGridLines";
import LayoutGridColumns from "extensions/guides/LayoutGridColumns";
import CustomGuides from "extensions/guides/CustomGuides";
import Brush from "./framework/Brush";
import EventHelper from "./framework/EventHelper";
import PropertyTracker from "framework/PropertyTracker";
import Page from "./framework/Page";
import StyleManager from "framework/style/StyleManager";
import OpenTypeFontManager, { DefaultFont } from "./OpenTypeFontManager";
import {
    Types,
    StoryType,
    ViewTool
} from "./framework/Defs";
import Font from "./framework/Font";
import GroupContainer from "./framework/GroupContainer";
import RepeatContainer from "./framework/repeater/RepeatContainer";
import CommandManager from "framework/commands/CommandManager";
import NullPage from "framework/NullPage";
import ModelStateListener from "framework/relayout/ModelStateListener";
import RelayoutQueue from "./framework/relayout/RelayoutQueue";
import PrimitiveHandler from "framework/sync/Primitive_Handlers";
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
import Story from "stories/Story";
import UserSettings from "./UserSettings";
import ObjectFactory from "./framework/ObjectFactory";
import ActionManager from "./ui/ActionManager";
import ShortcutManager from "./ui/ShortcutManager";
import ArtboardPage from "./ui/pages/ArtboardPage";
import Artboard from "./framework/Artboard";
import backend from "./backend";
import logger from "./logger";
import params from "./params";
import ArtboardFrame from "framework/ArtboardFrame";
import { IEvent2, IPage, IUIElement, IApp, IAppProps, IEvent, IEnvironment, ChangeMode, PatchType, ArtboardType, IPrimitive, IPrimitiveRoot, ViewState, IJsonNode, IFontManager, IStyleManager, StyleType, IArtboard, FontMetadata, AppSettings } from "carbon-core";
import { Contributions } from "./extensions/Contributions";
import { getBuiltInExtensions } from "./extensions/BuiltInExtensions";
import Command from "./framework/commands/Command";
import Primitive from "./framework/sync/Primitive";
import UIElement from "./framework/UIElement";
import RelayoutEngine from "./framework/relayout/RelayoutEngine";
import NullContainer from "framework/NullContainer";
import {deepEquals} from "util";

if (DEBUG) {
    window['env'] = Environment;
    window['Selection'] = Selection;
}

var platform = require("platform/Platform");
var Layer = require("framework/Layer");
var SelectComposite = require("framework/SelectComposite");
var SelectFrame = require("framework/SelectFrame");
var extensions = require("extensions/All");
var domUtil = require("utils/dom");
var Stopwatch = require("./Stopwatch");
var PropertyMetadata = require("framework/PropertyMetadata");
var Path = require("framework/Path");
var CompoundPath = require("framework/CompoundPath");

class AppClass extends DataNode implements IApp {
    props: IAppProps;

    [name: string]: any;
    isLoaded: boolean;
    project: any;

    modeChanged: IEvent<any>;

    activePage: IPage;
    pageChanged: IEvent2<IPage, IPage>;
    pageAdded: IEvent<IPage>;
    pageRemoved: IEvent<IPage>;

    activeStoryChanged: IEvent<any>;
    storyInserted: IEvent<any>;
    storyRemoved: IEvent<any>;

    modelSyncProxy: any;
    state: any;

    offlineModel: any;
    platform: any;

    environment: IEnvironment = Environment;

    shortcutManager: ShortcutManager;
    actionManager: ActionManager;
    fontManager: OpenTypeFontManager;
    dataManager: DataManager;
    styleManager: IStyleManager;

    onBuildMenu: any;
    changed: IEvent<IPrimitive[]>;
    changedLocally: IEvent<IPrimitive[]>;
    relayoutFinished: IEvent<void>;
    deferredChange: IEvent<any>;
    settingsChanged = EventHelper.createEvent<AppSettings>();

    updating = EventHelper.createEvent<void>();
    updated = EventHelper.createEvent<void>();

    resourceAdded = EventHelper.createEvent2<ArtboardType, IArtboard>();
    resourceChanged = EventHelper.createEvent2<ArtboardType, IArtboard>();
    resourceDeleted = EventHelper.createEvent3<ArtboardType, IArtboard, IPage>();

    currentToolChanged: IEvent<string>;
    _currentTool: string;

    private _loaded: IEvent<void>;
    private _clipArtboards: boolean = false;

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
        this._isOffline = false;
        this._mode = "edit";
        this.styleManager = StyleManager;
        var that = this;

        //events
        this._loaded = EventHelper.createEvent<void>();

        this.pageAdded = EventHelper.createEvent();
        this.pageRemoved = EventHelper.createEvent();
        this.pageChanged = EventHelper.createEvent2();
        this.pageChanging = EventHelper.createEvent();
        this.savedToJson = EventHelper.createEvent();
        this.relayoutFinished = EventHelper.createEvent<void>();

        this.selectionMade = EventHelper.createEvent();
        this.onBuildMenu = EventHelper.createEvent();
        this.offlineModeChanged = EventHelper.createEvent();

        this.modeChanged = EventHelper.createEvent();

        this.changed = EventHelper.createEvent();
        this.deferredChange = EventHelper.createEvent();
        this.changedLocally = EventHelper.createEvent();
        this.changedExternally = EventHelper.createEvent();

        this.storyInserted = EventHelper.createEvent();
        this.storyRemoved = EventHelper.createEvent();
        this.activeStoryChanged = EventHelper.createEvent();

        this._userSettings = JSON.parse(localStorage["_userSettings"] || '{}');

        this.migrationUpgradeNotifications = [];

        this.platform = platform;

        this.primitiveRootCache = {};
        this.modelSyncProxy = new ModelSyncProxy(this);

        this.state = new AppState(this);
        this.offlineModel = new OfflineModel();

        this.actionManager = new ActionManager(this as IApp);
        this.actionManager.registerActions();

        this.shortcutManager = new ShortcutManager();
        this.shortcutManager.mapDefaultScheme();

        this._currentTool = ViewTool.Pointer;
        this.currentToolChanged = EventHelper.createEvent();

        var token = Selection.onElementSelected.bind((selection, oldSelection, doNotTrack) => {
            let selectionIds = Selection.selectedElements().map(e => e.id());
            let oldSelectionIds = oldSelection.map(e => e.id());
            if (!doNotTrack && (selectionIds.length || oldSelectionIds.length)) {
                ModelStateListener.trackSelect(
                    this.activePage,
                    selectionIds,
                    oldSelectionIds,
                    this.userId());
            }
        });
        this.registerForDisposal(token);

        this.fontManager = new OpenTypeFontManager(this);
        this.fontManager.registerAsDefault();

        this.dataManager = new DataManager(this);

        token = Environment.detaching.bind(this, this.detachExtensions);
        this.registerForDisposal(token);

        token = Environment.attached.bind(this, this.initExtensions);
        this.registerForDisposal(token);

        var contributions = new Contributions(this, this.actionManager, this.shortcutManager);
        var extensions = getBuiltInExtensions(this, Environment);
        extensions.forEach(x => x.initialize(contributions));
    }

    init() {
        params.perf && performance.mark("App.Init");
        this.fontManager.clear();
        this.isLoaded = false;

        this.serverless(params.serveless);
        if (params.clearStorage) {
            this.offlineModel.clear();
        }
        params.perf && performance.measure("App.Init", "App.Init");
    }

    onLoad(callback: () => void) {
        if (this.isLoaded) {
            setTimeout(callback, 1);
            return;
        }
        var token = this._loaded.bind(() => {
            callback();
            token.dispose();
        });
    }

    userId() {
        return backend.getUserId();
    }

    activeStory(value?: any) {
        if (arguments.length > 0) {
            this._activeStory = value;
            this.activeStoryChanged.raise(value);
            Invalidate.requestInteractionOnly();
            if (value) {
                var page = this.findNodeByIdBreadthFirst(value.props.pageId);
                this.setActivePage(page);
            }
        }

        return this._activeStory;
    }

    getAllArtboards() {
        var res = [];
        for (var i = 0; i < this.pages.length; ++i) {
            var page = this.pages[i];
            var artboards = page.getAllArtboards();
            res = res.concat(artboards);
        }

        return res;
    }

    getAllFrames() {
        var res = [];
        for (var i = 0; i < this.pages.length; ++i) {
            var page = this.pages[i];
            var artboards = page.getAllArtboards();
            for (var j = 0; j < artboards.length; ++j) {
                var a = artboards[j];
                if (a.props.type === ArtboardType.Frame) {
                    res.push(a);
                }
            }
        }

        return res;
    }


    getAllResourceArtboards(resourceType) {
        var res = [];
        for (var i = 0; i < this.pages.length; ++i) {
            var page = this.pages[i];
            var artboards = page.getAllArtboards();
            for (var j = 0; j < artboards.length; ++j) {
                var a = artboards[j];
                if (a.props.type === resourceType) {
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
                if (a.props.type === ArtboardType.Template) {
                    children.unshift(a); // artboards coming in reversed order, so put it in front
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

    propsUpdated(props: Readonly<IAppProps>, oldProps, mode) {
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

        if (mode === ChangeMode.Self && props.defaultShapeSettings) {
            //if restoring from primitives or from server data
            ObjectFactory.updatePropsWithPrototype(props.defaultShapeSettings);
        }

        let settingsChanged = props.hasOwnProperty("name") || props.hasOwnProperty("avatar");
        if (settingsChanged) {
            let settings = {
                name: this.props.name, //important to use this.props to have a full object
                avatar: this.props.avatar
            };

            if (mode !== ChangeMode.Self) {
                let primitive = Primitive.projectSettingsChange(this.companyId(), this.id(), settings);
                ModelStateListener.track(this, primitive);
                Invalidate.request();
            }

            this.settingsChanged.raise(settings);
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
                    this.dataManager.registerProvider(item.id, null);
                    break;
            }
        }

        DataNode.prototype.propsPatched.apply(this, arguments);

        if (propName === "userSettings") {
            this._clipArtboards = this.getUserSetting("clipArtboards") || false;
        }
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
        this.setUserSetting("mirrorPageId", pageId);
        this.setUserSetting("mirrorArtboardId", artboardId);
    }

    mirroringCode(value) {
        if (arguments.length !== 0) {
            this.setUserSetting("mirroringCode", value);
        }

        return this.getUserSetting("mirroringCode")
    }

    _pasteArtboardFromString(s) {
        this.activePage.add(UIElement.fromJSON(JSON.parse(s)));
    }

    loadFont(family, style, weight): Promise<void> {
        return this.fontManager.load(family, style, weight);
    }

    saveFontMetadata(metadata: FontMetadata) {
        if (!this.props.fontMetadata.some(x => x.name === metadata.name)) {
            let metadataWithId = Object.assign({}, metadata, { id: metadata.name });
            this.patchProps(PatchType.Insert, "fontMetadata", metadataWithId);
        }
    }

    getFontMetadata(family) {
        return this.fontManager.getMetadata(family);
    }

    addDefaultFont() {
        this.saveFontMetadata({
            name: DefaultFont,
            fonts: [
                { style: 1, weight: 300, filename: "OpenSans-Light.ttf" },
                { style: 2, weight: 300, filename: "OpenSans-LightItalic.ttf" },
                { style: 1, weight: 400, filename: "OpenSans-Regular.ttf" },
                { style: 2, weight: 400, filename: "OpenSans-Italic.ttf" },
                { style: 1, weight: 600, filename: "OpenSans-Semibold.ttf" },
                { style: 2, weight: 600, filename: "OpenSans-SemiboldItalic.ttf" },
                { style: 1, weight: 700, filename: "OpenSans-Bold.ttf" },
                { style: 2, weight: 700, filename: "OpenSans-BoldItalic.ttf" },
                { style: 1, weight: 800, filename: "OpenSans-ExtraBold.ttf" },
                { style: 2, weight: 800, filename: "OpenSans-ExtraBoldItalic.ttf" }
            ],
            subsets: ["menu", "cyrillic", "cyrillic-ext", "devanagari", "greek", "greek-ext", "latin", "latin-ext", "vietnamese"],
            path: "apache/opensans"
        });
    }

    syncBroken(value?) {
        if (arguments.length === 1) {
            this._syncBroken = value;
        }
        return this._syncBroken;
    }

    isolationActive(): boolean {
        return Environment.view.isolationLayer.isActive;
    }

    isInOfflineMode(value?) {
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
                this.offlineModeChanged.raise();
            }
        }
        return this._isOffline;
    }

    loadRef(value?: number) {
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

    clear() {
        //TODO: do we still need the events for removing pages?
        this.children = [];
        this.setActivePage(NullPage);
    }

    isElectron() {
        return window && window['process'] && window['process'].type === 'renderer';
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
        page.enablePropsTracking();
        this.insertChild(page, this.children.length);
        this.initPage(page);
    }

    initPage(page) {
        if (!page.isInitialized()) {
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
        // if (element instanceof Page) {
        //     this.initPage(element);
        // } else
        if (element instanceof Story) {
            if (!this.activeStory()) {
                this.activeStory(element);
            }
        }

        this.insertChild(element, index, mode);
    }

    //TODO: if primitives call dataNode.insertChild, this is not needed
    remove(element) {
        this.removeChild(element);
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

    removePage(page: IPage, setNewActive?: boolean) {
        if (!page) {
            return;
        }
        this.beginUpdate();

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

        page.removing();
        this.removeChild(page);
        this.pageRemoved.raise(page);

        this.endUpdate();

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

    toJSON(pageIdMap?: any) {
        var json = {
            t: this.t,
            children: [],
            props: this.props,
            styles: this.styleManager.getStyles(StyleType.Visual),
            textStyles: this.styleManager.getStyles(StyleType.Text)
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

        this.savedToJson.raise(json);

        return json;
    }

    fromJSON(data) {
        ModelStateListener.stop();
        var that = this;
        that.clear()

        this.setProps(data.props, ChangeMode.Self);

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

    serverless(value?: boolean) {
        if (arguments.length === 1) {
            this.setProps({ serverless: value }, ChangeMode.Self);
        }
        return this.props.serverless;
    }

    defaultShapeSettings(value?: any, mode?: ChangeMode) {
        if (arguments.length) {
            this.setProps({ defaultShapeSettings: value }, mode);
        }
        return this.props.defaultShapeSettings;
    }

    defaultFill(value?: any, mode?: ChangeMode) {
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
            if (deepEquals(colors[i], color)) {
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
            this.setUserSetting("snapTo", value);
            return value;
        }
        return this.getUserSetting("snapTo") || UserSettings.snapTo;
    }

    clipArtboards(value?: boolean) {
        if (arguments.length !== 0) {
            this.setUserSetting("clipArtboards", value);
        }

        return this._clipArtboards;
    }

    getUserSetting(name: string) {
        var userId = backend.getUserId();

        for (var i = 0; i < this.props.userSettings.length; i++) {
            var s = this.props.userSettings[i];
            if (s.id.startsWith(userId) && s.id.split(":")[1] === name) {
                return s.value;
            }
        }

        return null;
    }

    setUserSetting(name: string, value: null | string | number | boolean | object) {
        var fullName = backend.getUserId() + ":" + name;
        var oldValue = this.getUserSetting(name);
        if (value === null) {
            if (oldValue !== null) {
                this.patchProps(PatchType.Remove, "userSettings", { id: fullName });
            }
        }
        else {
            this.patchProps((oldValue === null || oldValue === undefined) ? PatchType.Insert : PatchType.Change, "userSettings", { id: fullName, value });
        }
    }

    allowSelection(value) {
        if (value !== undefined) {
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

    companyId(value?) {
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

    mapElementsToLayerMask() {
        let count = 0;
        let max = Selection.elements.length;
        let activeArtboard = this.activePage.getActiveArtboard();
        let mainElement;

        if (activeArtboard) {
            mainElement = activeArtboard;
        } else {
            mainElement = this.activePage;
        }

        mainElement.applyVisitorTLR(e => {
            if (count && count === max) {
                e.runtimeProps.ctxl = 1 << 2;
                return;
            }

            let isSelected = Selection.isElementSelected(e);
            if (isSelected || count > 0) {
                var parent = e.parent();
                do {
                    if (parent.opacity() < 1 || parent.runtimeProps.mask) {
                        e = parent;
                        break;
                    }
                    parent = parent.parent();
                } while (parent && parent !== NullContainer);

                e.applyVisitorTLR(c => {
                    c.runtimeProps.ctxl = 1 << 1;
                });

                if (isSelected) {
                    count++;
                }

                return true;
            } else {
                e.runtimeProps.ctxl = 1 << 0;
            }
        })

        if (activeArtboard) {
            for (let artboard of this.activePage.getAllArtboards()) {
                if (artboard !== activeArtboard) {
                    artboard.applyVisitorTLR(c => {
                        c.runtimeProps.ctxl = 1 << 0;
                    });
                }
            }
        }

        if(count !== max) {
            for(var e of Selection.selectedElements()) {
                e.runtimeProps.ctxl = 1 << 1;
            }
        }

        Invalidate.request();
    }

    run() {
        params.perf && performance.mark("App.run");
        this.beginUpdate();

        this.clear();

        this.platform.run(this);

        let loggedIn = Promise.resolve();
        var stopwatch = new Stopwatch("AppLoad", true);
        if (!this.serverless()) {
            params.perf && performance.mark("App.setupConnection");
            backend.setupConnection(this);
            //for new apps ensure that the token is not stale, for existing app this will be checked when data is loaded
            if (!this.id()) {
                loggedIn = backend.ensureLoggedIn(true);
            }
            params.perf && performance.measure("App.setupConnection", "App.setupConnection");
        }

        this.addDefaultFont();

        var defaultFontLoaded = this.fontManager.loadDefaultFont();
        var dataLoaded = this.loadData();
        var importInitialResource = Promise.resolve();
        var externalPageData;
        if (this._initializeWithResource) {
            importInitialResource = fetch(this._initializeWithResource)
                .then(response => response.json())
                .then(data => externalPageData = data);
        }

        return Promise.all([dataLoaded, defaultFontLoaded, Environment.loaded, loggedIn, importInitialResource]).then(result => {
            var data = result[0];
            stopwatch.checkpoint("env");

            if (data) {
                this.fromJSON(data);
                stopwatch.checkpoint("parsing");
            }

            logger.trackEvent("AppLoaded", null, stopwatch.getMetrics());

            if (this.serverless()) {
                this.id("serverless");
            }

            if (externalPageData) {
                this.importExternalPage(externalPageData);
            }

            this.raiseLoaded();
            this.endUpdate();

            this.restoreWorkspaceState();
            this.releaseLoadRef();

            //that.platform.ensureCanvasSize();

            backend.enableLoginTimer();
            params.perf && performance.measure("App.run", "App.run");
        }).catch(function (e) {
            if (e.message !== "appNotFound") {
                logger.fatal("App not loaded", { error: e });
            }
            throw e;
        });
    }

    raiseLoaded() {
        this.isLoaded = true;
        this._loaded.raise();
    }

    loadData() {
        if (!this.id()) {
            return Promise.resolve();
        }
        return this.modelSyncProxy.getLatest();
    }

    get pages(): IPage[] {
        return (this.children as any).filter(p => p instanceof Page);
    }

    pagesWithSymbols() {
        return this.pages.filter(p => p.children.some(a => {
            if (a instanceof Artboard) {
                return a.props.type === ArtboardType.Symbol;
            }
            return false;
        }));
    }

    get stories() {
        return this.children.filter(p => p instanceof Story);
    }

    isEmpty() {
        return this.children.length === 0;
    }

    isDirty() {
        return this.state.isDirty();
    }

    relayout() {
        RelayoutEngine.performAppRelayout(this);
    }

    initializeWithResource(url: string) {
        this._initializeWithResource = url;
    }

    relayoutInternal() {

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

    viewportSize() {
        return this.platform.viewportSize();
    }

    isNew() {
        return !this.isSaved();
    }

    isSaved() {
        return !!this.id();
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

    importExternalPage(data) {
        var pageJson = data.page as IJsonNode;
        var name = ' (' + pageJson.props.name + ')';
        if (data.styles) {
            for (let style of data.styles) {
                style.name += name;
                this.styleManager.registerStyle(style, StyleType.Visual)
            }
        }

        if (data.textStyles) {
            for (let style of data.textStyles) {
                style.name += name;
                this.styleManager.registerStyle(style, StyleType.Text)
            }
        }

        if (data.fontMetadata) {
            for (var metadata of data.fontMetadata) {
                this.saveFontMetadata(metadata);
            }
        }

        return this.importPage(pageJson);
    }

    importPage(json: IJsonNode) {
        let page = this.pages.find(x => x.id() === json.props.id);
        if (!page) {
            page = this.importNewPage(json);
        }
        else {
            this.importUpdatedPage(page, json);
        }

        this.updated.raise();

        return page;
    }

    private importNewPage(pageJson: object) {
        var i = this.children.length;
        this.children.push(pageJson as any); //TODO: why?

        var page = ObjectFactory.getObject<IPage>(pageJson);

        this.children[i] = page;
        this.initPage(page);

        ModelStateListener.trackInsert(this, this, page, i);
        return page;
    }

    private importUpdatedPage(existingPage: IPage, pageJson: IJsonNode) {
        let elementsAdded = 0;
        for (let i = 0; i < pageJson.children.length; i++) {
            let elementJson = pageJson.children[i];
            let element = existingPage.children.find(x => x.id() === elementJson.props.id);
            let primitive: IPrimitive;
            if (element) {
                primitive = Primitive.dataNodeChange(element, element.toJSON());
            }
            else {
                element = ObjectFactory.fromJSON(elementJson);
                primitive = Primitive.dataNodeAdd(existingPage, element, existingPage.children.length + elementsAdded++);
            }
            RelayoutQueue.enqueue(primitive);
        }
    }

    createNewPage(type?) {
        var page = new ArtboardPage();

        page.setProps({
            orientation: (type || "portrait"),
            width: 1000,
            height: 1000
        }, ChangeMode.Self);
        //since page is a primitive root, it will fire model tracking event,
        //causing wrong order if primitives

        return page;
    }

    addNewPage() {
        var newPage = this.createNewPage();
        this.addPage(newPage);
        this.setActivePage(newPage);
    }

    registerForDisposal(d) {
        this._disposables.push(d);
    }

    unload() {
        this.clear();
        this.isLoaded = false;

        this.state.isDirty(false);

        ModelStateListener.clear();
        backend.shutdownConnection();
    }

    dispose() {
        this.unload();

        if (this.platform) {
            this.platform.dispose();
            this.platform = null;
        }
        if (this.state) {
            this.state.dispose();
            this.state = null;
        }
        if (this.dataManager) {
            this.dataManager.dispose();
            this.dataManager = null;
        }

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
        this.activeStory(story);
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

    removeStoryById(id) {
        var story = this.findNodeByIdBreadthFirst(id);
        this.removeStory(story);
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
            if (!data) {
                return;
            }

            var state = JSON.parse(data);
            if (!state) {
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
                var elements = this.activePage.findAllNodesDepthFirst<IUIElement>(x => state.selection.indexOf(x.id()) !== -1);
                if (elements.length) {
                    Selection.makeSelection(elements);
                }
            }
        }
        catch (e) {
            //ignore
        }
        finally {
            this._lastRelayoutView = Environment.view.viewState;
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

    assignNewName(element: IUIElement) {
        this.activePage.nameProvider.assignNewName(element);
    }

    beginUpdate() {
        this.updating.raise();
    }
    endUpdate() {
        this.updated.raise();
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
    },
    name: {
        defaultValue: "My carbon design"
    },
    avatar: {
        defaultValue: null
    }
});


window['App'] = AppClass;

export default AppClass;