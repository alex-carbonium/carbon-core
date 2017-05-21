import domUtil from "utils/dom";
import logger from "./logger";
import {backend} from "./CarbonApi";

var params = require("./params");
require("./../globalRequire");

var App = require("app");
var AppState = require("AppState");

var Defs = require("./framework/Defs");
var Util = require("util");

var app = App.Current = new App(true);

var ext = sessionStorage['extraParameters'];
if(ext){
    app.setProps({extraParameters:ext});
}

//export * from crashes in babel for some reason...
export default {
    "jquery": require("jquery/jquery.min"),
    "app": app,
    "params": params,
    "logger": logger,
    "Rect": require("./math/rect"),
    "Matrix": require("./math/matrix"),
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
    "util": require("./util"),
    "PropertyMetadata": require("./framework/PropertyMetadata"),
    "PropertyTracker": require("./framework/PropertyTracker"),
    "UIElement": require("./framework/UIElement"),
    "CompositeElement": require("./framework/CompositeElement"),
    "Image": require("./framework/Image"),
    "Container": require("./framework/Container"),
    "GroupContainer": require("./framework/GroupContainer"),
    "RepeatContainer": require("./framework/repeater/RepeatContainer"),
    "Page": require("./framework/Page"),
    "CommandManager": require("./framework/commands/CommandManager"),
    "Brush": require("./framework/Brush"),
    "Font": require("./framework/Font"),
    "Shadow": require("./framework/Shadow"),
    "Constraints": require("./framework/Constraints"),
    "NullContainer": require("./framework/NullContainer"),
    "NullPage": require("./framework/NullPage"),
    "Primitive": require("./framework/sync/Primitive"),
    "Shape": require("./framework/Shape"),
    "Rectangle": require("./framework/Rectangle"),
    "Circle": require("./framework/Circle"),
    "PageExporter": require("./framework/share/PageExporter"),

    "MirroringController": require("./framework/MirroringController"),
    "MirroringView": require("./framework/MirroringView"),

    "ActionManager": app.actionManager,
    "IconsInfo": require("./ui/IconsInfo"),
    "Text": require("./framework/text/Text"),
    //expose specific defs for easier conversion to consts
    "PrimitiveType": Defs.PrimitiveType,
    "ContextBarPosition": Defs.ContextBarPosition,
    "PatchType": Defs.PatchType,
    "ChangeMode": Defs.ChangeMode,
    "TileSize": Defs.TileSize,
    "Types": Defs.Types,
    "ViewTool": Defs.ViewTool,
    "Context": require("./framework/render/Context"),
    "ContextPool": require("./framework/render/ContextPool"),
    "Keyboard": require("./platform/Keyboard"),
    "Platform": require("./platform/Platform"),
    "StyleManager": require("./framework/style/StyleManager"),
    "Selection": require("./framework/SelectionModel"),
    "QuadAndLock": require("./framework/QuadAndLock"),
    "AnimationType": Defs.AnimationType,
    "EasingType": Defs.EasingType,
    "ActionType": Defs.ActionType,
    "Devices": Defs.Devices,

    "createUUID": Util.createUUID,
    "choosePasteLocation": require("./framework/PasteLocator").choosePasteLocation,

    "ToolboxConfiguration": require("./ui/toolbox/ToolboxConfiguration"),

    "CompositeCommand": require("./framework/commands/CompositeCommand"),

    "SelectComposite": require("./framework/SelectComposite"),
    "DraggingElement": require("./framework/interactions/DraggingElement"),
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

    "CoreIntl": require("./CoreIntl"),

    "DebugUtil": require("./DebugUtil"),
    "FontsProxy": require("./server/FontsProxy"),

    "SvgParser":require("svg/SvgParser"),

    "Story": require("./stories/Story"),
    "StoryAction": require("./stories/StoryAction"),
    "StoryType": Defs.StoryType,

    "Invalidate": require("./framework/Invalidate"),
    "NameProvider": require("./ui/NameProvider")
};
