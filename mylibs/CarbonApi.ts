/* @preserve
*
* All rights reserved (c) 2017, Carbon Design.
* This library can only be used in software components owned by Carbon Design. Any form of other use is strictly prohibited.
*/

import backend from "./backend";
import logger from "./logger";
import DashboardProxy from "./server/DashboardProxy";

require("./PromiseConfig");
require("./server/AccountProxy");
require("./server/StaticResourcesProxy");
require("./server/ShareProxy");
require("./server/FileProxy");
require("./server/fontsProxy");
require("./server/GalleryProxy");

export {backend, logger, DashboardProxy}