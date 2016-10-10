var webpack = require("webpack");
var path = require("path");
var extend = require("node.extend");

var defaults = {
    minimize   : false,
    debug      : true,        
    port       : 8080,
    host       : "http://localhost",
    devtool    : "#eval",
    verbose    : false,
    showConfig : true,    
    trace      : true
};

function getEntry(settings){
    var entry = {
        app: fullPath("../mylibs/SketchFacade"),
        api: fullPath("../mylibs/CarbonApi")
    };
    return entry;
}
function getOutput(settings){
    var output = {
        publicPath: settings.authority + "/target/"
    };

    output.path = fullPath("../target");
    output.filename = "carbon-[name]-[hash].js";
    output.library = "carbon-[name]";
    output.libraryTarget = "umd";
    console.log("Writing lib to " + output.path + output.filename);    

    return output;
}
function getResolve(settings){
    var resolves = {
        root: [fullPath("../mylibs")],
        alias: {
        },
        extensions: ["", ".es6.js", ".js", ".jsx", ".less", ".html"]
    };

    return resolves;
}

function getPlugins(settings){
    var plugins = [
        new webpack.IgnorePlugin(/.*/g, /export\/html/g),
        new webpack.IgnorePlugin(/\.orig$/g),
        new webpack.IgnorePlugin(/canvas/g)

        // new webpack.ProvidePlugin({
        //     'fetch': 'imports?this=>global!exports?global.fetch!whatwg-fetch'
        // })
    ];

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
    if (settings.minimize){
        plugins.push(
            new webpack.optimize.UglifyJsPlugin({
                compressor: {
                    warnings: false
                }
            }),
            new webpack.optimize.DedupePlugin()
        );
    }

    return plugins;
}

function getLoaders(settings){
    var plugins = [
        require.resolve("babel-plugin-transform-runtime"),
        require.resolve("babel-plugin-add-module-exports"),
        fullPath("../../babel/classType"),
        //remove when babel 6 has proper support for decorators
        require.resolve("babel-plugin-transform-decorators-legacy")
    ];

    if (!settings.trace){
        plugins.push(fullPath("../../babel/removeDebug"));
        plugins.push(require.resolve("babel-plugin-transform-remove-console"));
    }
    if(settings.minimize) {
        plugins.push(require.resolve("babel-plugin-transform-react-constant-elements"));
        plugins.push(require.resolve("babel-plugin-transform-react-inline-elements"));
    }
    var babelSettings = {
        babelrc: false, //do not use settings from referenced packages
        "presets": [
            require.resolve("babel-preset-es2015"),
            require.resolve("babel-preset-stage-0"),
            require.resolve("babel-preset-react")
        ],
        "plugins": plugins,
        ast:false
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
            test: /\.es6\.js$/,
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
    console.log(settings);

    var config = {
        context       : fullPath("../mylibs"),
        entry         : getEntry(settings),
        output        : getOutput(settings),
        resolve       : getResolve(settings),
        resolveLoader : {
            root  : fullPath("node_modules")            
        },
        amd: {jQuery: true},
        module: {
            loaders: getLoaders(settings)
        },
        plugins   : getPlugins(settings),
        devtool   : "source-map",
        debug     : !settings.minimize        
    };

    settings.showConfig && console.log(config);

    return config;
};

function fullPath(relativePath){
    return path.join(__dirname, relativePath);
}
