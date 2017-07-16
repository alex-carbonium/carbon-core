/* @preserve
*
* All rights reserved (c) 2017, Carbon Design.
* This library can only be used in software components owned by Carbon Design. Any form of other use is strictly prohibited.
*/

require("./PromiseConfig");

let backend = require("./backend");
let logger = require("./logger");
let DashboardProxy = require("./server/DashboardProxy");

require("./server/AccountProxy");
require("./server/StaticResourcesProxy");
require("./server/ShareProxy");
require("./server/FileProxy");
require("./server/fontsProxy");
require("./server/GalleryProxy");

export {backend, logger, DashboardProxy}