require("babel-register");

var fs = require("fs");
var webpack = require('webpack');
var WebpackDevServer = require('webpack-dev-server');
var argv = require('yargs').argv;
var open = require('open');

function watch(options) {
    options = Object.assign({}, options);
    var config    = require("./make-examples-config")(options);
    var devServer = config.devServer;
    var compiler  = webpack(config);

    console.log("Starting webpack...");
    new WebpackDevServer(compiler, devServer).listen(devServer.port, devServer.host,
        function (err) {
            if (err) throw err;

            open(`http://${devServer.host}:${devServer.port}/target/example.html`);
        });
}

watch(argv);