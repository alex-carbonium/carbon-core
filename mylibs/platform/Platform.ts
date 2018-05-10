import { isBrowser } from "../util";
import Desktop from "./Desktop";
import Node from "./Node";
import Basic from "./Basic";
import params from "../params";

var platform = null;

function isMobile() {
    return window && (window as any).location && (window as any).location.pathname.startsWith('/m/');
}

if (!isBrowser) {
    platform = new Node();
}
else if (params.basicPlatform) {
    platform = new Basic();
}
else {
    platform = new Desktop(!isMobile());
}

if (!platform) {
    throw "Could not initialize app for "
    + " DeviceType=" + params.deviceType
    + " DeviceOS=" + params.deviceOS;
}

export default platform;