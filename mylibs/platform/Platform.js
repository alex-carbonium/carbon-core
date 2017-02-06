import { isBrowser } from "../util";
import Desktop from "./Desktop";
import Node from "./Node";
import Basic from "./Basic";
import params from "../params";

var platform = null;

if (!isBrowser) {
    platform = new Node();
}
else if (params.basicPlatform) {
    platform = new Basic();
}
else {    
    if (params.deviceType === "Computer" || params.deviceType === "Tablet") {
        platform = new Desktop();
    }
}

if (!platform) {
    throw "Could not initialize app for "
        + " DeviceType=" + params.deviceType
        + " DeviceOS=" + params.deviceOS;
}

export default platform;