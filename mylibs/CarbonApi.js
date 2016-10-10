import backend from "./backend";
import domUtil from "./utils/dom";

export default {
    Promise: require("./PromiseConfig"),
    backend,
    DashboardProxy: require("./server/DashboardProxy"),
    AccountProxy: require("./server/AccountProxy"),
    logger: require("./logger"),
    domUtil: domUtil
}