/* @preserve
*
* All rights reserved (c) 2017, Carbon Design.
* This library can only be used in software components owned by Carbon Design. Any form of other use is strictly prohibited.
*/

import domUtil from "utils/dom";
import logger from "./logger";
import { backend } from "./CarbonApi";
import Symbol from "./framework/Symbol";

var params = require("./params");
require("./../globalRequire");

var App = require("app");
var AppState = require("AppState");

var Defs = require("./framework/Defs");
var Util = require("util");

var app = App.Current = new App(true);

var ext = sessionStorage['extraParameters'];
if (ext) {
    app.setProps({ extraParameters: ext });
}

//export * from crashes in babel for some reason...
export default {
    "jquery": require("jquery/jquery.min"),
    "app": app,
    "AppClass": App,
    "params": params,
    "logger": logger,
    "Rect": require("./math/rect"),
    "Point": require("./math/point"),
    "Matrix": require("./math/matrix"),
    "NearestPoint": require("math/NearestPoint"),
    "AngleAdjuster": require("./math/AngleAdjuster"),
    "ObjectFactory": require("./framework/ObjectFactory"),
    "DesignerView": require("./framework/DesignerView"),
    "ViewBase": require("./framework/ViewBase"),
    "DesignerController": require("./framework/DesignerController"),
    "PreviewView": require("./framework/PreviewView"),
    "PreviewController": require("./framework/PreviewController"),
    "PreviewProxy": require("./framework/preview/PreviewProxy"),
    "Clipboard": require("./framework/Clipboard"),
    "Environment": require("./environment"),
    "workspace": require("./environment"),
    "UserSettings": require("./UserSettings"),
    "backend": backend,
    "imageCache": require("./imageCache"),
    "util": require("./util"),
    "PropertyMetadata": require("./framework/PropertyMetadata"),
    "PropertyTracker": require("./framework/PropertyTracker"),
    "UIElement": require("./framework/UIElement"),
    "CompositeElement": require("./framework/CompositeElement"),
    "DataNode": require("./framework/DataNode"),
    "Image": require("./framework/Image"),
    "Container": require("./framework/Container"),
    "GroupContainer": require("./framework/GroupContainer"),
    "RepeatContainer": require("./framework/repeater/RepeatContainer"),
    "RepeatCell": require("./framework/repeater/RepeatCell"),
    "Page": require("./framework/Page"),
    "ArtboardPage": require("./ui/pages/ArtboardPage"),
    "CommandManager": require("./framework/commands/CommandManager"),
    "Brush": require("./framework/Brush"),
    "Font": require("./framework/Font"),
    "OpenTypeFontManager": require("./OpenTypeFontManager").default,
    "Shadow": require("./framework/Shadow"),
    "Constraints": require("./framework/Constraints"),
    "NullPage": require("./framework/NullPage"),
    "Primitive": require("./framework/sync/Primitive"),
    "Shape": require("./framework/Shape"),
    "Rectangle": require("./framework/Rectangle"),
    "Circle": require("./framework/Circle"),
    "Polygon": require("./framework/Polygon"),
    "Star": require("./framework/Star"),
    "UIElementDecorator": require("./framework/UIElementDecorator"),

    "MirroringController": require("./framework/MirroringController"),
    "MirroringView": require("./framework/MirroringView"),

    "ActionManager": app.actionManager,
    "Text": require("./framework/text/Text"),
    //expose specific defs for easier conversion to consts
    "PrimitiveType": Defs.PrimitiveType,
    "ContextBarPosition": Defs.ContextBarPosition,
    "PatchType": Defs.PatchType,
    "ChangeMode": Defs.ChangeMode,
    "Types": Defs.Types,
    "Context": require("./framework/render/Context"),
    "ContextPool": require("./framework/render/ContextPool"),
    "RenderLoop": require("./framework/render/RenderLoop"),
    "RenderPipeline": require("./framework/render/RenderPipeline"),
    "RelayoutQueue": require("./framework/relayout/RelayoutQueue"),
    "Keyboard": require("./platform/Keyboard"),
    "Platform": require("./platform/Platform"),
    //TODO: remove
    "BasePlatform": require("./platform/All"),
    "StyleManager": require("./framework/style/StyleManager"),
    "Selection": require("./framework/SelectionModel"),
    "QuadAndLock": require("./framework/QuadAndLock"),
    "AnimationType": Defs.AnimationType,
    "EasingType": Defs.EasingType,
    "ActionType": Defs.ActionType,
    "Devices": Defs.Devices,

    "createUUID": Util.createUUID,
    "choosePasteLocation": require("./framework/PasteLocator").choosePasteLocation,

    "SelectComposite": require("./framework/SelectComposite"),
    "SelectFrame": require("./framework/SelectFrame"),
    "Layer": require("./framework/Layer"),

    "domUtil": domUtil,
    "Cursors": require("Cursors"),

    "LayoutGridLines": require("./extensions/guides/LayoutGridLines"),
    "LayoutGridColumns": require("./extensions/guides/LayoutGridColumns"),
    "CustomGuides": require("./extensions/guides/CustomGuides"),

    "Symbol": Symbol,
    "Artboard": require("./framework/Artboard"),
    "StateBoard": require("./framework/StateBoard"),
    "RequestAnimationSettings": require("./ui/prototyping/RequestAnimationSettings"),

    "CoreIntl": require("./CoreIntl"),

    "DebugUtil": require("./DebugUtil"),

    "SvgParser": require("svg/SvgParser"),

    "Story": require("./stories/Story"),
    "StoryAction": require("./stories/StoryAction"),
    "StoryType": Defs.StoryType,

    "Invalidate": require("./framework/Invalidate"),
    "NameProvider": require("./ui/NameProvider"),

    //TODO: replace with math/rect
    "TextRect": require("./framework/text/primitives/rect"),

    //TODO: move to UI
    "RepeaterActions": require("./framework/repeater/RepeaterActions").RepeaterActions,
    "SymbolActions": require("./extensions/SymbolActions")
};
