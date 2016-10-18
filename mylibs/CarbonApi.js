import backend from "./backend";

export default {
    Promise: require("./PromiseConfig"),
    backend,
    DashboardProxy: require("./server/DashboardProxy"),
    AccountProxy: require("./server/AccountProxy"),
    logger: require("./logger")
}