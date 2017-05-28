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

export {backend, logger, DashboardProxy}