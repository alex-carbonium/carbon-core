var fs = require("fs");
var path = require("path");

var requirejs = require("requirejs");

GLOBAL.define = requirejs.define;

var filePath = path.join(__dirname, "mylibs/ui/web/composites/RadioGroupThree.js");
var file = fs.readFileSync(filePath);
requirejs([filePath], function(){
    console.log("asd");
});

