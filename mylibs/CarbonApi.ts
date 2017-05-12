import backend from "./backend";
import logger from "./logger";
import DashboardProxy from "./server/DashboardProxy";

require("./PromiseConfig");
require("./server/AccountProxy");

export {backend, logger, DashboardProxy}