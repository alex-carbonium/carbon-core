import {isBrowser} from "../util";

define(["./PC", "./OSX", "./FullScreen", "./Node", "./Basic", "../params"], function(PC, OSX, FullScreen, Node, Basic, params){
    if (!isBrowser){
        return new Node();
    }

    if (sketch.params.basicPlatform){
        return new Basic();
    }

    var deviceOS = params.deviceOS;
    var deviceType = params.deviceType;

    if (sketch.params.fullScreenView){
        return new FullScreen();
    }
    if (deviceType === "Computer" || deviceType === "Tablet"){
        return deviceOS === "MacOS" ? new OSX() : new PC();
    }

    throw "Could not initialize app for "
        + " DeviceType=" + deviceType
        + " DeviceOS=" + deviceOS
        + " FullScreen=" + sketch.params.fullScreenView;
});
