import LayoutGridLines from "./extensions/guides/LayoutGridLines";
import LayoutGridColumns from "./extensions/guides/LayoutGridColumns";
import CustomGuides from "./extensions/guides/CustomGuides";
import Brush from "./framework/Brush";
import EventHelper from "./framework/EventHelper";
import Page from "./framework/Page";
import StyleManager from "./framework/style/StyleManager";
import { DefaultFont, OpenTypeFontManager } from "./framework/text/OpenTypeFontManager";
import {
    Types
} from "./framework/Defs";
import Font from "./framework/Font";
import NullPage from "./framework/NullPage";
import ModelStateListener from "./framework/relayout/ModelStateListener";
import RelayoutQueue from "./framework/relayout/RelayoutQueue";
import Selection from "./framework/SelectionModel";
import Invalidate from "./framework/Invalidate";
import Workspace from "./Workspace";
import ModelSyncProxy from "./server/ModelSyncProxy";
import DataNode from "./framework/DataNode";
import DataManager from "./framework/data/DataManager";
import AppState from "./AppState";
import OfflineModel from "./offline/OfflineModel";
import Story from "./stories/Story";
import UserSettings from "./UserSettings";
import ObjectFactory from "./framework/ObjectFactory";
import ActionManager from "./ui/ActionManager";
import ShortcutManager from "./ui/ShortcutManager";
import ArtboardPage from "./ui/pages/ArtboardPage";
import Artboard from "./framework/Artboard";
import backend from "./backend";
import logger from "./logger";
import params from "./params";
import { IEvent2, IPage, IUIElement, IApp, IAppProps, IEvent, IWorkspace, ChangeMode, PatchType, ArtboardType, IPrimitiveRoot, ViewState, IJsonNode, IFontManager, IStyleManager, StyleType, IArtboard, FontMetadata, AppSettings, Primitive, IStory, StoryType } from "carbon-core";
import UIElement from "./framework/UIElement";
import RelayoutEngine from "./framework/relayout/RelayoutEngine";
import NullContainer from "./framework/NullContainer";
import { deepEquals } from "./util";
import { primitiveFactory } from "./framework/sync/PrimitiveFactory";

if (DEBUG) {
    window['env'] = Workspace;
    window['Selection'] = Selection;
}

var Layer = require("framework/Layer");
var SelectFrame = require("framework/SelectFrame");

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
    onsplash: IEvent<any>;

    activePage: IPage;
    pageChanged: IEvent2<IPage, IPage>;
    pageChanging: IEvent2<IPage, IPage>;
    pageAdded: IEvent<IPage>;
    pageRemoved: IEvent<IPage>;

    activeStoryChanged: IEvent<any>;
    storyInserted: IEvent<any>;
    storyRemoved: IEvent<any>;

    modelSyncProxy: any;
    state: any;

    offlineModel: any;

    shortcutManager: ShortcutManager;
    actionManager: ActionManager;
    fontManager: OpenTypeFontManager;
    dataManager: DataManager;
    styleManager: IStyleManager;

    onBuildMenu: any;
    changed: IEvent<Primitive[]>;
    changedLocally: IEvent<Primitive[]>;
    settingsChanged = EventHelper.createEvent<AppSettings>();

    updating = EventHelper.createEvent<void>();
    updated = EventHelper.createEvent<void>();

    resourceAdded = EventHelper.createEvent2<ArtboardType, IArtboard>();
    resourceChanged = EventHelper.createEvent2<ArtboardType, IArtboard>();
    resourceDeleted = EventHelper.createEvent3<ArtboardType, IArtboard, IPage>();
    resourcePageChanged = EventHelper.createEvent<IPage>();

    recentColorsChanged = EventHelper.createEvent<any[]>();
    disposed: boolean;

    private _loaded: IEvent<void>;
    private _unloaded: IEvent<void>;
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
        this._enableRenderCache = true;
        this._allowSelection = true;
        this._isOffline = false;
        this._mode = "edit";
        this.styleManager = StyleManager;
        var that = this;

        //events
        this._loaded = EventHelper.createEvent<void>();
        this._unloaded = EventHelper.createEvent<void>();

        this.pageAdded = EventHelper.createEvent();
        this.pageRemoved = EventHelper.createEvent();
        this.pageChanged = EventHelper.createEvent2();
        this.pageChanging = EventHelper.createEvent2();
        this.savedToJson = EventHelper.createEvent();

        this.selectionMade = EventHelper.createEvent();
        this.onBuildMenu = EventHelper.createEvent();
        this.offlineModeChanged = EventHelper.createEvent();

        this.modeChanged = EventHelper.createEvent();

        this.onsplash = EventHelper.createEvent();

        this.changed = EventHelper.createEvent();
        this.changedLocally = EventHelper.createEvent();
        this.changedExternally = EventHelper.createEvent();

        this.storyInserted = EventHelper.createEvent();
        this.storyRemoved = EventHelper.createEvent();
        this.activeStoryChanged = EventHelper.createEvent();

        this._userSettings = JSON.parse(localStorage["_userSettings"] || '{}');

        this.migrationUpgradeNotifications = [];

        this.modelSyncProxy = new ModelSyncProxy(this);

        this.state = new AppState(this);
        this.offlineModel = new OfflineModel();

        this.actionManager = new ActionManager(this as IApp, Workspace.shortcutManager);
        this.actionManager.registerActions();

        var token = Selection.onElementSelected.bind((selection, oldSelection, doNotTrack) => {
            if (this.activePage === NullPage) {
                return;
            }
            let selectionIds = Selection.selectedElements().map(e => e.id);
            let oldSelectionIds = oldSelection.map(e => e.id);
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
    }


    init() {
        params.perf && performance.mark("App.Init");
        this.onsplash.raise({ progress: 0, message: '@load.app' });

        this.fontManager.clear();
        this.isLoaded = false;

        this.serverless(params.serveless);
        if (params.clearStorage) {
            this.offlineModel.clear();
        }
        params.perf && performance.measure("App.Init", "App.Init");
    }

    enableRenderCache(value) {
        if (arguments.length) {
            this._enableRenderCache = value;
            this.mapElementsToLayerMask();
        }

        return this._enableRenderCache;
    }

    onLoad(callback: () => void, sync?: boolean) {
        if (this.isLoaded) {
            if (sync) {
                callback();
            } else {
                setTimeout(callback, 1);
            }
            return;
        }
        var token = this._loaded.bind(() => {
            callback();
            token.dispose();
        });
    }

    onUnload(callback: () => void) {
        var token = this._unloaded.bind(() => {
            callback();
            token.dispose();
        });

        return token;
    }

    userId() {
        return backend.getUserId();
    }

    activeStory(value?: any) {
        if (arguments.length > 0) {
            this._activeStory = value;
            this.activeStoryChanged.raise(value);
            Invalidate.requestInteractionOnly();
            // if (value) {
            //     var page = this.findNodeByIdBreadthFirst(value.props.pageId);
            //     this.setActivePage(page);
            // }
        }

        let pageId = this.activePage.id;

        if (!this._activeStory || this._activeStory.props.pageId !== pageId) {
            this._activeStory = this.stories.find(s => s.props.pageId === pageId);
        }

        if (!this._activeStory) {
            this.addStory({
                name: 'default',
                pageId: pageId,
                type: StoryType.Prototype,
                description: '',
                pageName: this.activePage.name
            });
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
                res.push({ name: page.name, id: page.id, children: children })
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
                let primitive = primitiveFactory.projectSettingsChange(this.companyId(), this.id, settings);
                ModelStateListener.track(this, primitive);
                Invalidate.request();
            }

            this.settingsChanged.raise(settings);
        }

        if (props.recentColors) {
            this.recentColorsChanged.raise(props.recentColors);
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

        DataNode.prototype.propsPatched.apply(this, arguments);

        if (propName === "userSettings") {
            this._clipArtboards = this.getCurrentUserSetting("clipArtboards") || false;
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

        return this.getCurrentUserSetting("mirroringCode")
    }

    _pasteArtboardFromString(s) {
        this.activePage.add(UIElement.fromJSON(JSON.parse(s)));
    }

    loadFont(family, style, weight): Promise<void> {
        return this.fontManager.load(family, style, weight);
    }

    saveFontMetadata(metadata: FontMetadata, mode?: ChangeMode) {
        if (!this.props.fontMetadata.some(x => x.name === metadata.name)) {
            let metadataWithId = Object.assign({}, metadata, { id: metadata.name });
            this.patchProps(PatchType.Insert, "fontMetadata", metadataWithId, mode);
        }
    }

    getFontMetadata(family) {
        return this.fontManager.getMetadata(family);
    }

    addDefaultFont() {
        //existing apps with id should use ChangeMode.Self since font metadata is stored in json
        //new apps should use ChangeMode.Model to save the initial font
        //serverless apps always use self to avoid duplicate metadata from primitives
        let mode = this.serverless() ? ChangeMode.Self : this.id ? ChangeMode.Self : ChangeMode.Model;

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
        }, mode);
    }

    syncBroken(value?) {
        if (arguments.length === 1) {
            this._syncBroken = value;
        }
        return this._syncBroken;
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
            page.initPage();
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
    remove(element, mode?) {
        if (element instanceof Page) {
            this.removePage(element, mode);
        }
        else {
            this.removeStory(element);
        }
    }

    removePage(page, mode?) {
        let removingActive = page === this.activePage;

        if (removingActive) {
            this.beginUpdate();
            this.setNewActivePage(page);
        }

        page.removing();
        super.removeChild(page, mode);
        this.pageRemoved.raise(page);

        if (removingActive) {
            this.endUpdate();
        }
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

    private setNewActivePage(pageBeingRemoved: IPage) {
        var indexOfRemoved = this.pages.indexOf(pageBeingRemoved);

        if (pageBeingRemoved === this.activePage) {
            var newActive = this.pages[indexOfRemoved + 1];
            if (!newActive) {
                newActive = this.pages[indexOfRemoved - 1];
            }
            if (newActive) {
                this.setActivePage(newActive);
            }
        }
    }

    duplicatePageById(pageId) {
        // TODO: do not materialize, to clone
        var page = DataNode.getImmediateChildById(this, pageId, true);
        var newPage = page.clone();
        newPage.initId();
        newPage.name = "Copy of " + page.name;
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
                include = pageIdMap[page.id];
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
        if (!color) {
            return;
        }

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
        return this.getCurrentUserSetting("snapTo") || UserSettings.snapTo;
    }

    clipArtboards(value?: boolean) {
        if (arguments.length !== 0) {
            this.setUserSetting("clipArtboards", value);
        }

        return this._clipArtboards;
    }

    getCurrentUserSetting(name: string) {
        var userId = backend.getUserId();
        return this.getUserSetting(userId, name);
    }

    getUserSetting(userId: string, name: string) {
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
        var oldValue = this.getCurrentUserSetting(name);
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

    private _updateWithSelectionMask(e) {
        var parent: any = e.parent;
        do {
            if (parent.opacity < 1 || parent.runtimeProps.mask || parent.clipSelf()) {
                e = parent;
                break;
            }
            parent = parent.parent;
        } while (parent && parent !== NullContainer);

        if (e && e !== NullContainer) {
            e.applyVisitorBreadthFirst(c => {
                c.runtimeProps.ctxl = 1 << 1;
            });
        }
    }

    _getArtboardForElement(e: IUIElement) {
        if (!e) {
            return null;
        }

        if (e instanceof Artboard) {
            return e;
        }

        var root: IUIElement = e.primitiveRoot();
        if (root === e) {
            root = e.parent;
        }

        if (root instanceof Artboard) {
            return root;
        }

        return this._getArtboardForElement(root);
    }

    mapElementsToLayerMask() {
        let count = 0;
        let max = Selection.elements.length;
        let mainElement;
        let isArtboardWithSelection = false;

        let artboardsMap = Selection.selectedElements()
            .map(e => this._getArtboardForElement(e))
            .reduce((bag, value, index, array) => {
                if (value) {
                    bag[value.id] = true;
                }

                return bag;
            }, {});

        for (let e of this.activePage.childrenIterator<IUIElement>()) {
            let isSelected = Selection.isElementSelected(e);
            let isArtboard = e instanceof Artboard;
            let isOnPage = e.parent === this.activePage;

            if (isArtboard) {
                isArtboardWithSelection = !!artboardsMap[e.id];
            }

            // set all elements on artbord without selection to layer 1
            if (!isArtboardWithSelection && (!isOnPage || isArtboard)) {
                e.runtimeProps.ctxl = 1 << 0;
                continue;
            }

            if (count && count === max) {
                // if we already marked all selected elements, the rest goes to 1<<2 layer.
                let parent = e.parent;
                if (parent.runtimeProps.ctxl === 1 << 1) {
                    e.runtimeProps.ctxl = 1 << 1;
                } else {
                    e.runtimeProps.ctxl = 1 << 2;
                }
                continue;
            }

            if (isSelected || count > 0) {
                this._updateWithSelectionMask(e);

                if (isSelected) {
                    count++;
                }

                continue;
            }

            e.runtimeProps.ctxl = 1 << 0;
        }

        // if (count !== max) {
        //     for (var e of Selection.selectedElements()) {
        //         this._updateWithSelectionMask(e);
        //     }
        // }

        this.updateCacheProperties();

        Invalidate.request();
    }

    updateCacheProperties() {
        // updated all elements to see if caching is allowed for them
        this.activePage.applyVisitor(e => {
            if (!e.children || !e.children.length) {
                e.runtimeProps.allowCache = !e.disableRenderCaching();
            } else {
                let ctxl = e.runtimeProps.ctxl;
                e.runtimeProps.allowCache = (!e.disableRenderCaching()) && (e.children as any[]).every(child => (child.runtimeProps.ctxl === ctxl) && child.allowCaching());
                if (!e.runtimeProps.allowCache && e.runtimeProps.rc) {
                    e.clearRenderingCache();
                }
            }
        });
    }

    run() {
        params.perf && performance.mark("App.run");
        this.beginUpdate();

        this.clear();
        let progress = 10;

        let progressInc = () => {
            if (progress <= 50) {
                progress += 1;
                this.onsplash.raise({ progress: progress });
                setTimeout(progressInc, 200)
            }
        }
        setTimeout(progressInc, 200);

        let loggedIn = Promise.resolve();
        var stopwatch = new Stopwatch("AppLoad", true);
        if (!this.serverless()) {
            params.perf && performance.mark("App.setupConnection");
            backend.setupConnection(this);
            //for new apps ensure that the token is not stale, for existing app this will be checked when data is loaded
            if (!this.id) {
                loggedIn = backend.ensureLoggedIn(true);
                loggedIn.then(() => progress += 10);
            }
            params.perf && performance.measure("App.setupConnection", "App.setupConnection");
        }

        this.addDefaultFont();

        this.onsplash.raise({ progress: progress, message: '@load.data' });
        var defaultFontLoaded = this.fontManager.loadDefaultFont();
        defaultFontLoaded.then(() => progress += 10);
        var dataLoaded = this.loadData();
        dataLoaded.then(() => progress += 30);
        var importInitialResource = Promise.resolve();
        if (this._initializeWithResource) {
            backend.galleryProxy.trackPublicResourceUsed(this._initializeWithResource);

            importInitialResource = backend.shareProxy.getPageSetup(this._initializeWithResource)
                .then(page => fetch(page.dataUrl))
                .then(response => response.json());
            //TODO: handle error for non-existing resources
        }

        return Promise.all([dataLoaded, importInitialResource, defaultFontLoaded, loggedIn]).then(result => {
            progress += 10;
            this.onsplash.raise({ progress: progress, message: '@load.prepareenv' });
            var data = result[0];
            var externalPageData = result[1];
            stopwatch.checkpoint("env");

            if (data) {
                this.fromJSON(data);
                stopwatch.checkpoint("parsing");
            }

            progress += 10;
            this.onsplash.raise({ progress: progress, message: '@load.almostthere' });

            logger.trackEvent("AppLoaded", null, stopwatch.getMetrics());

            if (this.serverless()) {
                this.id = "serverless";
            }

            if (externalPageData) {
                this.importExternalPage(externalPageData);
            }

            this.raiseLoaded();
            this.endUpdate();

            this.releaseLoadRef();

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
        this.onsplash.raise({ progress: 80, message: '@load.almostdone' });
        this.isLoaded = true;
        this.mapElementsToLayerMask();
        this._loaded.raise();

        setTimeout(() => {
            this.onsplash.raise({ progress: 100, message: '@load.done' });
        }, 1000);
    }

    loadData() {
        if (!this.id) {
            return Promise.resolve(null);
        }
        return backend.projectProxy.getModel(this.companyId(), this.id);
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

    initializeWithResource(resourceId: string) {
        this._initializeWithResource = resourceId;
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

        page.activated(oldPage);
        this.mapElementsToLayerMask();
        this.pageChanged.raise(oldPage, page);
        return true;
    }

    setActivePageById(pageId) {
        if (this.activePage.id !== pageId) {
            var page = DataNode.getImmediateChildById(this, pageId, true);
            this.setActivePage(page);
        }
    }

    setActiveStoryById(storyId) {
        var story = DataNode.getImmediateChildById(this, storyId, true);
        this.activeStory(story);
    }

    isNew() {
        return !this.isSaved();
    }

    isSaved() {
        return !!this.id;
    }

    isPreviewMode() {
        return this._mode === "preview";
    }

    isPrototypeMode() {
        return this._mode === "prototype";
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
        let page = this.pages.find(x => x.id === json.props.id);
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
            let element = existingPage.children.find(x => x.id === elementJson.props.id);
            let primitive: Primitive;
            if (element) {
                primitive = primitiveFactory.dataNodeChange(element, element.toJSON());
            }
            else {
                element = ObjectFactory.fromJSON(elementJson);
                primitive = primitiveFactory.dataNodeAdd(existingPage, element, existingPage.children.length + elementsAdded++);
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
        this._unloaded.raise();
        this.props = PropertyMetadata.getDefaultProps(this.t) as IAppProps;
        this.resetRuntimeProps();

        this.isLoaded = false;

        this.state.isDirty(false);

        ModelStateListener.clear();
        backend.shutdownConnection();
    }

    dispose() {
        this.unload();

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

    addStory(props: IStory) {
        var story = new Story();
        story.setProps(props);
        this.insertChild(story, this.children.length);
        this.activeStory(story);
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

    removeStoryById(id) {
        var story = this.findNodeByIdBreadthFirst(id);
        this.removeStory(story);
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
            fill: Brush.createFromCssColor(UserSettings.shapes.defaultFill),
            stroke: Brush.createFromCssColor(UserSettings.shapes.defaultStroke)
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