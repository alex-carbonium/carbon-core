import backend from "./backend";
import logger from "./logger";
import DashboardProxy from "./server/DashboardProxy";
import AccountProxy from "./server/AccountProxy";

backend.init(logger);

export {backend, logger, DashboardProxy, AccountProxy};