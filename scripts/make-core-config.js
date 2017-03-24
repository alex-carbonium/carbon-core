var webpack = require("webpack");
var fs = require("fs");
var path = require("path");
var extend = require("node.extend");

var HtmlWebpackPlugin = require('html-webpack-plugin');

var defaults = {
    minimize: false,
    noUglify: false,
    debug: true,
    port: 8090,
    host: "http://localhost",
    devServer: true,
    devtool: "eval",
    verbose: false,
    showConfig: false,
    trace: true
};

function getEntry(settings){
    if (settings.example){
        var dir = fullPath("../mylibs/test/examples");
        return {
            example: [
                'webpack-dev-server/client?' + settings.authority
                ]
                .concat(
                    fs.readdirSync(dir)
                        .filter(x => path.extname(x) === ".js")
                        .map(x => path.join(dir, x))
                )
        };
    }

    var entry = {
        core: [fullPath("../mylibs/CarbonCore")],
        api: [fullPath("../mylibs/CarbonApi")]
    };

    if (settings.devServer){
        //entry.core.unshift('webpack-dev-server/client?' + settings.authority, 'webpack/hot/only-dev-server');
        //entry.api.unshift('webpack-dev-server/client?' + settings.authority, 'webpack/hot/only-dev-server');
    }

    return entry;
}
function getOutput(settings){
    var output = {
        publicPath: settings.authority + "/target/"
    };

    output.path = fullPath("../target");
    output.filename = "carbon-[name]" + (settings.minimize ? "-[chunkhash]" : "") + ".js";
    output.library = "__carbon[name]";
    if (!settings.example){
        output.libraryTarget = "jsonp";
    }

    return output;
}
function getResolve(settings){
    var resolves = {
        root: [fullPath("../mylibs")],
        alias: {},
        extensions: ["", ".js", ".jsx", ".less", ".html"]
    };

    return resolves;
}

function getPlugins(settings){
    var plugins = [
        new webpack.IgnorePlugin(/.*/g, /export\/html/g),
        new webpack.IgnorePlugin(/\.orig$/g),
        new webpack.IgnorePlugin(/canvas/g),

        // new webpack.DllPlugin({
        //     path: fullPath("../target/[name]-manifest.json"),
        //     name: "[name]"
        // })

        // new webpack.ProvidePlugin({
        //     'fetch': 'imports?this=>global!exports?global.fetch!whatwg-fetch'
        // })
    ];

    if (settings.example){
        plugins.push(new HtmlWebpackPlugin({
            template: './test/examples/example.ejs',
            filename: 'example.html',
            chunksSortMode: 'none'
        }))
    }

    var defines = {
        DEBUG: settings.debug,
        'process.env.NODE_ENV': settings.minimize ? '"production"' : '"dev"'
    };
    plugins.push(new webpack.DefinePlugin(defines));
    plugins.push(new webpack.NormalModuleReplacementPlugin(/ResponseValidator/, fullPath("../mylibs/AccessTokenValidator.js")));

    if (!settings.trace){
        plugins.push(new webpack.NormalModuleReplacementPlugin(/debug/, fullPath("../mylibs/emptyDebug.js")));
        plugins.push(new webpack.NormalModuleReplacementPlugin(/DebugUtil/, fullPath("../mylibs/emptyDebug.js")));
    }
    if (settings.minimize && !settings.noUglify){
        plugins.push(
            new webpack.optimize.UglifyJsPlugin({
                compressor: {
                    warnings: false
                }
            })
        );
    }

    return plugins;
}

function getLoaders(settings){
    var plugins = [
        require.resolve("babel-plugin-transform-runtime"),
        require.resolve("babel-plugin-add-module-exports"),
        require.resolve("babel-plugin-transform-flow-strip-types"),
        //remove when babel 6 has proper support for decorators
        require.resolve("babel-plugin-transform-decorators-legacy")
    ];

    if (!settings.trace){
        plugins.push(fullPath("./babel/removeDebug"));
        plugins.push(require.resolve("babel-plugin-transform-remove-console"));
    }
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

    var excludedFolders = ["node_modules", "libs", "generated"];
    var excludes = new RegExp(
        excludedFolders.map(x => "[\/\\\\]" + x + "[\/\\\\]").join("|"));
    var loaders = [
        {
            test: /\.js$/,
            include: /oidc\-client/,
            loaders: [babelLoader]
        },
        {
            test: /\.js$/,
            loaders: [babelLoader],
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
    settings.authority = settings.host ? settings.host + (settings.port ? ":" + settings.port : "") : "";

    var config = {
        context: fullPath("../mylibs"),
        entry: getEntry(settings),
        output: getOutput(settings),
        externals: {
            "carbon-core": "window.c.ignore",
            "carbon-api": "window.c.ignore",
            "carbon-geometry": "window.c.ignore",
            "carbon-rendering": "window.c.ignore",
            "carbon-app": "window.c.ignore",
            "carbon-basics": "window.c.ignore"
        },
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
        devServer : {
            contentBase        : fullPath('../target/'),
            publicPath         : settings.authority + "/target/",
            host               : settings.host.substring(settings.host.indexOf("//") + 2),
            port               : settings.port,
            hot                : true,
            stats: {
                colors: true,
                timings: true,
                assets: settings.verbose,
                chunks: settings.verbose,
                modules: settings.verbose,
                children: settings.verbose,
                hash: settings.verbose,
                version: settings.verbose,
                errors: settings.verbose,
                errorDetails: settings.verbose
            }
        },
        cache: true
    };

    settings.showConfig && console.log(config);

    return config;
};

function fullPath(relativePath){
    return path.join(__dirname, relativePath);
}
