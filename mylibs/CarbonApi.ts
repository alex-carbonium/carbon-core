import backend from "./backend";
import logger from "./logger";
import DashboardProxy from "./server/DashboardProxy";
import { BrushType } from "carbon-basics";

require("./server/AccountProxy");

export {backend, logger, DashboardProxy};