require("babel-register");

var fs = require("fs");
var path = require("path");
var argv = require('yargs').argv;

var KarmaServer = require('karma').Server;

var settings = {
    configFile: path.join(__dirname, './karma.conf.js'),
    singleRun: argv.singleRun,
    coreLoader: argv.coreLoader || "url"
};
if (settings.singleRun){
    settings.reporters = ["trx"];
    settings.browsers = ["PhantomJS"];
    settings.browserNoActivityTimeout = 5 * 60 * 1000;
}
else if (argv.browser){
    settings.browsers = [argv.browser];
}

var server = new KarmaServer(settings);
server.start();