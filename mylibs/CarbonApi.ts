/* @preserve
*
* All rights reserved (c) 2017, Carbon Design.
* This library can only be used in software components owned by Carbon Design. Any form of other use is strictly prohibited.
*/

require("./PromiseConfig");

require("jquery/jquery.min");
require("../libs/jquery.signalR-2.1.1");

let backend = require("./backend");
let logger = require("./logger");
let globals = require("./globals");
let DashboardProxy = require("./server/DashboardProxy");
let util = require("./util");
//TODO: split platform
let platform = require("./params");

require("./server/AccountProxy");
require("./server/StaticResourcesProxy");
require("./server/ShareProxy");
require("./server/FileProxy");
require("./server/fontsProxy");
require("./server/GalleryProxy");
require("./server/ActivityProxy");
require("./server/DataProxy");

export {backend, logger, DashboardProxy, globals, util, platform}