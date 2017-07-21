window.debug = require("debug");

require("webExtensions");

require("script");
require("seedrandom");
require("framework/EventHelper");

require("webExtensions");
require("jquery/jquery.min");
require("./libs/jquery.signalR-2.1.1");

require("commands/Move");

require("framework/CorruptedElement");
require("framework/interactions/ResizeRotateElement");

require("framework/Circle");
require("framework/Rectangle");
require("framework/Line");
require("framework/Star");

require("ui/common/Canvas");
require("ui/common/DockPanel");
require("ui/common/AlignPanel");
require("ui/common/StackPanel");

require("svg/SvgPath");