import domUtil from "utils/dom";

var params = require("./params");
require("./../globalRequire");

var App = require("app");
var AppState = require("AppState");
var Resources = require("framework/Resources");

var backend = require("backend");
var Defs = require("./framework/Defs");
var Util = require("util");

var fwk = sketch.framework;
var ui = sketch.ui;

var app = App.Current = new App(true);

var ext = sessionStorage['extraParameters'];
if(ext){
    app.setProps({extraParameters:ext});
}

var AllCommands = require("./commands/AllCommands");

//export * from crashes in babel for some reason...
module.exports = {
    "jquery": require("jquery/jquery.min"),
    "Promise": require("./PromiseConfig"),
    "app": app,
    "params": params,
    "logger": require("./logger"),
    "ObjectFactory": require("./framework/ObjectFactory"),
    "DesignerView": require("./framework/DesignerView"),
    "ViewBase": require("./framework/ViewBase"),
    "DesignerController": require("./framework/DesignerController"),
    "PreviewView":require("./framework/PreviewView"),
    "PreviewController":require("./framework/PreviewController"),
    "PreviewProxy":require("./framework/preview/PreviewProxy"),
    "Clipboard": require("./framework/Clipboard"),
    "Environment": require("./environment"),
    "backend": backend,
    "imageCache": require("./imageCache"),
    "analytics": require("./analytics"),
    "util": require("./util"),
    "PropertyMetadata": require("./framework/PropertyMetadata"),
    "PropertyTracker": require("./framework/PropertyTracker"),
    "UIElement": require("./framework/UIElement"),
    "CompositeElement": require("./framework/CompositeElement"),
    "Frame": require("./framework/Frame"),
    "FrameSource": require("./framework/FrameSource"),
    "NoSelectionElement": require("./framework/NoSelectionElement"),
    "Container": require("./framework/Container"),
    "GroupContainer": require("./framework/GroupContainer"),
    // "PlaceholderElement": require("./framework/PlaceHolderElement"),
    "Page": require("./framework/Page"),
    "CommandManager": require("./framework/commands/CommandManager"),
    "Brush": require("./framework/Brush"),
    "Font": require("./framework/Font"),
    "Anchor": require("./framework/Anchor"),
    "NullContainer": require("./framework/NullContainer"),
    "NullPage": require("./framework/NullPage"),
    "Primitive": require("./framework/sync/Primitive"),
    "Shape": require("./framework/Shape"),
    "Rectangle": require("./framework/Rectangle"),
    "Circle": require("./framework/Circle"),
    "PubSub": require("./framework/Pubsub"),
    "PageExporter": require("./framework/share/PageExporter"),

    "MirroringController": require("./framework/MirroringController"),
    "MirroringView": require("./framework/MirroringView"),

    "ActionManager": require("./ui/ActionManager"),
    "IconsInfo": require("./ui/IconsInfo"),
    "Text": require("./framework/text/Text"),
    //expose specific defs for easier conversion to consts
    "TextAlign": Defs.TextAlign,
    "FontScript": Defs.FontScript,
    "FontStyle": Defs.FontStyle,
    "FontWeight": Defs.FontWeight,
    "UnderlineStyle": Defs.UnderlineStyle,
    "PrimitiveType": Defs.PrimitiveType,
    "PatchType": Defs.PatchType,
    "ChangeMode": Defs.ChangeMode,
    "TileSize": Defs.TileSize,
    "ContentSizing": Defs.ContentSizing,
    "FontManager": require("./OpenTypeFontManager"),
    "Tiler": require("./ui/toolbox/tiler"),
    "Context": require("./framework/render/Context"),
    "ContextPool": require("./framework/render/ContextPool"),
    "Deferred": require("./framework/Deferred"),
    "Resources": require("./framework/Resources"),
    "Keyboard": require("./platform/Keyboard"),
    "Platform": require("./platform/Platform"),
    "StyleManager": require("./framework/style/StyleManager"),
    "DataManager": require("./framework/data/DataManager"),
    "Selection": require("./framework/SelectionModel"),
    "QuadAndLock": require("./framework/QuadAndLock"),
    "AnimationType": Defs.AnimationType,
    "EasingType": Defs.EasingType,
    "ActionType": Defs.ActionType,
    "Devices": Defs.Devices,

    "createUUID": Util.createUUID,
    "choosePasteLocation": require("./framework/PasteLocator").choosePasteLocation,

    "ToolboxConfiguration": require("./ui/toolbox/ToolboxConfiguration"),

    "AppPropsChanged": require("./commands/AppPropsChanged"),
    "CompositeCommand": require("./framework/commands/CompositeCommand"),
    "AllCommands": AllCommands,

    "SelectComposite": require("./framework/SelectComposite"),
    "DraggingElement": require("./framework/DraggingElement"),
    "SelectFrame": require("./framework/SelectFrame"),
    "Layer": require("./framework/Layer"),

    "domUtil": domUtil,
    "ShareProxy": require("./server/ShareProxy"),
    "ActivityProxy": require("./server/ActivityProxy"),
    "AccountProxy": require("./server/AccountProxy"),
    "FileProxy": require("./server/FileProxy"),

    "LayoutGridLines": require("./extensions/guides/LayoutGridLines"),
    "LayoutGridColumns": require("./extensions/guides/LayoutGridColumns"),
    "CustomGuides": require("./extensions/guides/CustomGuides"),

    "ArtboardTemplateControl": require("./framework/ArtboardTemplateControl"),
    "Artboard": require("./framework/Artboard"),
    "StateBoard": require("./framework/StateBoard"),
    "RequestAnimationSettings": require("./ui/prototyping/RequestAnimationSettings"),

    "Intl": require("./Intl"),

    "DebugUtil": require("./DebugUtil"),
    "FontsProxy": require("./server/FontsProxy"),

    "SvgParser":require("svg/SvgParser"),

    "Story": require("./stories/Story"),
    "StoryAction": require("./stories/StoryAction"),
    "StoryType": Defs.StoryType,

    "Fitting": require("./math/Fitting"),

    "Invalidate": require("./framework/Invalidate"),
    "NameProvider": require("./ui/NameProvider")
};
