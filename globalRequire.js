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

window.Perf = require("react-addons-perf")

require("jquery");

require("./libs/jquery.filedrop");
require("./libs/jquery-ui-1.10.3.custom");
require("webExtensions");
require("./libs/jqueryExtensions");

require("imports?this=>window!./libs/modernizr-2.8.2");

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
require("./../Scripts/jquery.signalR-2.1.1");
require("./../Scripts/jquery.cookie");

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

require("ui/charts/ChartContainer");
require("ui/charts/LineChart");
require("ui/charts/BarChart");
require("ui/charts/DonutChart");

require("ui/behavior/CheckboxBehavior");
require("ui/behavior/DropDownBehavior");
require("ui/behavior/ProgressBehavior");
require("ui/behavior/ScrollBarBehavior");
require("ui/behavior/SliderBehavior");
require("ui/behavior/SwitchBehavior");
require("ui/childrenBehavior/ChildPropertyBehavior");
require("ui/childrenBehavior/ChildrenVisibleBehavior");
require("ui/childrenBehavior/SelectedItemBehavior");
require("ui/childrenBehavior/SeparationBehavior");
require("ui/childrenBehavior/ChildrenCountBehavior");
require("ui/childrenBehavior/ChildrenWidthBehavior");

require("svg/SvgPath");

require("projects/WebProject");
require("projects/AndroidProject");