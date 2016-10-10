if (!window.sketch){
    window.sketch = {};
}

window.sketch.params = {
    projectType: "WebProject"
};

module.exports = {
    deviceType: "Computer",
    deviceOS: navigator.userAgent.indexOf("Mac") != -1 ? "MacOS" : "Generic",
    transport: "auto",
    init: function(q){
        Object.assign(this, q);
    }
};