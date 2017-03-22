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

            if (argv.copyToUi){
                updateFiles(webpackConfig.output.path, fullPath("../../carbon-ui/target"));
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

function updateFiles(sourceDir, targetDir){
    if (fs.existsSync(targetDir)){
        cleanPreviousFiles(targetDir);
    }
    else{
        fs.mkdirSync(targetDir);
    }

    var files = fs.readdirSync(sourceDir);
    for (var i = 0; i < files.length; i++){
        var file = files[i];
        if (file.endsWith(".js") || file.endsWith(".map")){
            var filePath = path.join(sourceDir, file);
            var destFile = path.join(targetDir, file);
            fs.createReadStream(filePath).pipe(fs.createWriteStream(destFile));
        }
    }
}

function cleanPreviousFiles(dir){
    if (!fs.existsSync(dir)){
        return;
    }

    var files = fs.readdirSync(dir);
    for (var i = 0; i < files.length; i++){
        var file = files[i];
        if (file.match(/carbon\-api/g) || file.match(/carbon\-core/g)){
            var filePath = path.join(dir, file);
            console.log("Cleaning up", filePath);
            fs.unlinkSync(filePath);
        }
    }
}

function fullPath(relativePath){
    return path.join(__dirname, relativePath);
}

var config = require("./make-core-config")(Object.assign({
    minimize: true,
    debug: false,
    devServer: false,
    host: "",
    port: "",
    devtool: "#source-map"
}, argv));

cleanPreviousFiles(fullPath("../target"));
pack(config);