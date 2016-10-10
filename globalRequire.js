if (typeof sketch === "undefined"){
    sketch = {};
}
if (!sketch.framework){
    sketch.framework = {};
}
if (!sketch.ui){
    sketch.ui = {};
}
if (!sketch.ui.common){
    sketch.ui.common = {};
}
window.debug = require("debug");

require("webExtensions");

require("script");
require("Strings");
require("seedrandom");
sketch.framework.EventHelper = require("framework/EventHelper");

var logger = require("logger");
window.logger = logger;

var backend = require("backend");
window.backend = backend;

require("webExtensions");
require("analytics");
require("./libs/jquery.signalR-2.1.1");

require("commands/AllCommands");
require("framework/Deferred");
require("framework/Pubsub");
require("framework/notifier");

require("framework/CorruptedElement");
require("framework/ScrollContainer");

require("framework/Circle");
require("framework/Rectangle");
require("framework/Line");
require("framework/Star");

require("framework/ImageSource");

require("ui/BasicIcons");
require("ui/Basic2Icons");
require("ui/AndroidIcons");

require("ui/common/Image");
require("ui/common/Icon");
require("ui/common/Table");
require("ui/common/TableCell");
require("ui/common/Canvas");
require("ui/common/DockPanel");
require("ui/common/AlignPanel");
require("ui/common/ClickSpot");
require("ui/common/StackPanel");

require("svg/SvgPath");

require("projects/WebProject");
require("projects/AndroidProject");