require("babel-register");
var webpack = require('webpack');
var fs = require("fs");
var path = require("path");
var Promise = require("bluebird");
var argv = require('yargs').argv;

var webpackAsync = Promise.promisify(webpack);

function pack(webpackConfig) {
    process.env.NODE_ENV = 'production';
    return webpackAsync(webpackConfig)
        .then(stats => {
            console.log(stats.toString({colors: !argv.noColors}));
            var json = stats.toJson();
            if (json.errors.length){
                throw new Error('webpack failed');
            }
            //var statsPath = path.join(webpackConfig.output.path, "stats.json");
            //console.log("Writing stats", statsPath);
            //fs.writeFileSync(statsPath, JSON.stringify(json, null, '  '), 'utf-8');

            if (!argv.sourceMaps){
                dropSourceMapReferences(webpackConfig.output.path);
            }
        });
}

function dropSourceMapReferences(outPath){
    var files = fs.readdirSync(outPath);
    for (var i = 0; i < files.length; i++){
        var file = path.join(outPath, files[i]);
        if (file.endsWith(".js") || file.endsWith(".css")){
            var content = fs.readFileSync(file, "utf-8");
            content = content.replace(/#\ssourceMappingURL=/g, '//');
            console.log("Clearing sourcemaps in", file);
            fs.writeFileSync(file, content, "utf-8");
        }
    }
}

var config = require("./make-webpack-config")(Object.assign({    
    minimize: true,
    debug: false,
    host: "",
    port: ""
}, argv));

pack(config);