var azure = require("azure-storage");
var fs = require("fs");
var path = require("path");
var zlib = require("zlib");
var Promise = require("bluebird");
var argv = require('yargs').argv;

var container = "sourcemaps";

var service = new azure.BlobService(argv.accountName, argv.accountKey);
service.createContainerIfNotExists(container, function () {
    var dir = path.join(__dirname, "../target");
    var files = fs.readdirSync(dir).filter(x => x.endsWith(".js.map"));

    var tasks = [];
    for (var i = 0; i < files.length; ++i) {
        var file = path.join(dir, files[i]);
        tasks.push(
            gzipFile(file)
                .then(zipped => uploadFile(zipped, path.basename(file)))
        );
    }
    Promise.all(tasks)
        .then(() => console.log("Files uploaded"))
        .catch(e => console.log(e));
});

function uploadFile(file, blobName) {
    return new Promise((resolve, reject) => {
        service.doesBlobExist(container, blobName, (err, result) => {
            if (err) return reject(err);

            if (result.exists) {
                console.log("Blob already exists:", blobName);
            }
            else {
                console.log("Uploading:", blobName);
                var metadata = { contentSettings: { contentEncoding: 'gzip' } };
                service.createBlockBlobFromLocalFile(container, blobName, file, metadata, (err) => {
                    if (err) { reject(err) };
                    resolve();
                });
            }
        });
    });
}

function gzipFile(file) {
    return new Promise((resolve, reject) => {
        var tempFile;
        var gzip = zlib.createGzip({ level: 9 });
        var inp;
        var out;
        inp = fs.createReadStream(file);
        tempFile = file + '.zip';
        out = fs.createWriteStream(tempFile);
        gzip.on('error', reject);
        out.on('close', function () {
            resolve(tempFile);
        });
        inp.pipe(gzip).pipe(out);
    });
}

