var webpack = require("webpack");
var fs = require("fs");
var path = require("path");
var extend = require("node.extend");

var CheckerPlugin = require('awesome-typescript-loader').CheckerPlugin;

var defaults = {
    debug: true,
    https: false,
    devtool: "eval",
    verbose: true,
    showConfig: false
};

function getEntry(settings){
    return {};
}
function getOutput(settings){
    var output = {};
    output.library = "test";
    return output;
}
function getExternals(settings) {
    var result = {};
    result["carbon-core"] = "window.c.core";
    result["carbon-api"] = "window.c.api";
    return result;
}
function getResolve(settings){
    var resolves = {
        root: [],
        alias: {},
        extensions: ["", ".js", ".jsx", ".less", ".html", ".ts"]
    };

    return resolves;
}

function getPlugins(settings){
    var plugins = [
        new webpack.IgnorePlugin(/\.orig$/g),

        new CheckerPlugin()
    ];

    var defines = {
        DEBUG: settings.debug,
        'process.env.NODE_ENV': settings.minimize ? '"production"' : '"dev"'
    };
    plugins.push(new webpack.DefinePlugin(defines));

    return plugins;
}

function getLoaders(settings){
    var plugins = [
        require.resolve("babel-plugin-transform-promise-to-bluebird"),
        require.resolve("babel-plugin-transform-runtime"),
        require.resolve("babel-plugin-add-module-exports"),
        //remove when babel 6 has proper support for decorators
        require.resolve("babel-plugin-transform-decorators-legacy")
    ];

    var babelSettings = {
        babelrc: false, //do not use settings from referenced packages
        "presets": [
            require.resolve("babel-preset-es2015"),
            require.resolve("babel-preset-stage-0")
        ],
        "plugins": plugins,
        ast: false,
        cacheDirectory: true
    };
    var babelLoader = "babel?" + JSON.stringify(babelSettings);

    var excludedFolders = ["node_modules"];
    var excludes = new RegExp(
        excludedFolders.map(x => "[\/\\\\]" + x + "[\/\\\\]").join("|"));
    var loaders = [
        {
            test: /\.js$/,
            loaders: [babelLoader],
            exclude: excludes
        },
        {
            test: /\.ts$/,
            loaders: [babelLoader, "awesome-typescript-loader"],
            exclude: excludes
        },
        {
            test: /^worker!/,
            loaders: ["worker"],
            exclude: excludes
        }
    ];

    return loaders;
}

module.exports = function(settings){
    settings = extend({}, defaults, settings);

    var config = {
        context: fullPath("../mylibs"),
        entry: getEntry(settings),
        output: getOutput(settings),
        externals: getExternals(settings),
        resolve: getResolve(settings),
        resolveLoader: {
            root: fullPath("../node_modules")
        },
        amd: {jQuery: true},
        module: {
            loaders: getLoaders(settings)
        },
        plugins: getPlugins(settings),
        devtool: settings.devtool,
        debug: !settings.minimize,
        cache: true
    };

    settings.showConfig && console.log(config);

    return config;
};

function fullPath(relativePath){
    return path.join(__dirname, relativePath);
}
