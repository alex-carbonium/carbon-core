var path = require("path");
var fs = require("fs");
var webpack = require("webpack");

var testfolder = path.join(path.dirname(fs.realpathSync(__filename)), "..");
process.chdir(testfolder);

function resolveCodeModule(root, dir, moduleFileName){
    var fullDir = path.join(root, dir);
    var files = fs.readdirSync(fullDir);
    var modules = files.filter(x => x.startsWith(moduleFileName) && x.endsWith(".js"));
    if (modules.length === 0){
        throw new Error("No core modules found: " + dir);
    }
    if (modules.length > 1){
        throw new Error("Multiple core modules found, clean and download again.\r\n" + modules.join("\r\n"));
    }
    return path.join(fullDir, modules[0]);
}

module.exports = function (config) {
    var webpackConfig = require("./make-test-config")({
        coreLoader: config.coreLoader
    });

    var files = ["../node_modules/babel-polyfill/dist/polyfill.js"];
    if (config.coreLoader === "url") {
        files.push(
            "../mylibs/test/ut/TestCoreLoader.js",
            "http://localhost:8090/target/carbon-api.js",
            "http://localhost:8090/target/carbon-core.js"
        );
    }
    else if (config.coreLoader === "target") {
        files.push(
            "../mylibs/test/ut/TestCoreLoader.js",
            resolveCodeModule(testfolder, "target", "carbon-api"),
            resolveCodeModule(testfolder, "target", "carbon-core")
        );
    }

    files.push("../mylibs/test/ut/TestBootloader.js");

    config.set({
        // base path that will be used to resolve all patterns (eg. files, exclude)
        basePath: "../mylibs",
        // frameworks to use
        // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
        frameworks: ["mocha", /*"chai-as-promised",*/ "chai"],
        // list of files / patterns to load in the browser
        files: files,
        // proxies: {
        //     "/fonts/": "/base/fonts/"
        // },
        // list of files to exclude
        exclude: [],
        // preprocess matching files before serving them to the browser
        // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
        preprocessors: {
            "../mylibs/test/ut/TestBootloader.js": ["webpack", "sourcemap"]
        },
        // test results reporter to use
        // possible values: "dots", "progress"
        // available reporters: https://npmjs.org/browse/keyword/karma-reporter
        reporters: ["progress"],
        // web server port
        port: 9876,
        // enable / disable colors in the output (reporters and logs)
        colors: true,
        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_INFO,
        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: true,
        // start these browsers
        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        browsers: ["Chrome_DevTools_Saved_Prefs"],
        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: false,
        webpack: webpackConfig,
        webpackServer: {
            noInfo: true
        },

        customLaunchers: {
            Chrome_DevTools_Saved_Prefs: {
                base: "Chrome",
                flags: ["--enable-logging --v=1 --user-data-dir=" + path.join(require("os").homedir(), "carbon-chrome")]
            },
            PhantomJS_Debug: {
                base: "PhantomJS",
                debug: true
            }
        },

        client: {
            mocha: {
                timeout: 30 * 60 * 1000
            }
        },

        trxReporter: { outputFile: "core-tests.trx", shortTestName: false }
    })
};
