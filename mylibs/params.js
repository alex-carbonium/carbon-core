import {UAParser} from "ua-parser-js";

var parser = new UAParser(navigator.userAgent);

if (!window.sketch){
    window.sketch = {};
}

window.sketch.params = {
    projectType: "WebProject"
};

module.exports = {
    deviceType: parser.getDevice().type || "Computer",
    deviceOS: parser.getOS().name,
    browser: parser.getBrowser(),
    transport: "auto",
    init: function(q){
        Object.assign(this, q);
    }
};