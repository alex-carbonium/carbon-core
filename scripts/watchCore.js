require("babel-register");

var fs = require("fs");
var webpack = require('webpack');
var WebpackDevServer = require('webpack-dev-server');
var argv = require('yargs').argv;

function watch(options) {
    var config    = require("./make-core-config")(options);
    var devServer = config.devServer;
    var compiler  = webpack(config);

    console.log("Starting webpack...");
    new WebpackDevServer(compiler, devServer).listen(devServer.port, devServer.host,
        function (err) {
            if (err) throw err;
        });
}

watch(argv);