var ts = require('typescript/lib/typescript.js');

var files = {};

var options = {
    target: 1,
    module: 1,
    noLib: true,
    inlineSourceMap: true,
    inlineSources: true,
    allowJs: false,
    noEmitOnError: true,
    allowNonTsExtensions: true,
    noImplicitAny: true,
    noImplicitThis: true,
    noImplicitReturns: true,
    removeComments: true,
    strictNullChecks: true,
    alwaysStrict: true
};

// Create the language service host to allow the LS to communicate with the host
var servicesHost = {
    getScriptFileNames: function () { return Object.keys(files) },
    getScriptVersion: function (fileName) { return files[fileName] && files[fileName].version.toString() },
    getScriptSnapshot: function (fileName) {
        if (!files[fileName]) {
            return undefined;
        }

        return ts.ScriptSnapshot.fromString(files[fileName].text);
    },
    getCurrentDirectory: function () { return "." },
    getCompilationSettings: function () { return options },
    getDefaultLibFileName: function (options) { return "lib.d.ts"; },
    fileExists: function (fileName) {
        return !!files[fileName];
    },
    readFile: function (fileName) {
        return files[fileName].text;
    }
};

// Create the language service files
var services = ts.createLanguageService(servicesHost, ts.createDocumentRegistry());

addEventListener('message', function (e) {
    var fileName = e.data.fileName;
    if (fileName) {
        if (e.data.text) {
            var version = 0;
            if (files[fileName]) {
                version = files[fileName].version || 0;
            }
            files[fileName] = { text: e.data.text, version: version + 1 };
        }

        if (!stringEndsWith(fileName, '.d.ts')) {
            emitFile(e.data.fileName);
        }
    }
});

function getExportedSymbols(fileName) {
    var program = services.getProgram();
    var sourceFile = program.getSourceFile(fileName);
    var checker = program.getTypeChecker();
    var exports = undefined;
    function visit(node) {
        // Only consider exported nodes
        if (isNodeExported(node)) {
            if (node.name) {
                var symbol = node.symbol;
                if (symbol && node.name.text) {
                    var type = checker.typeToString(checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration))
                    if (!stringStartsWith(type, 'typeof ')) {
                        exports = exports || {};
                        exports[node.name.text] = type;
                    }
                }
            }
        }
        // todo: need to optimize if statement here to avoid traversing all nodes
        //if (ts.isNamespaceBody(node) || ts.isModuleOrEnumDeclaration(node)) {
        ts.forEachChild(node, visit);
        // }
    }

    ts.forEachChild(sourceFile, visit);

    return exports;
}

function emitFile(fileName) {
    var output = services.getEmitOutput(fileName);

    if (output.emitSkipped) {
        logErrors(fileName);
        return;
    }

    var exports = getExportedSymbols(fileName);

    output.outputFiles.forEach(function (o) {
        postMessage({ fileName: fileName, resultFileName: o.name, exports: exports, error: false, text: o.text });
    });
}


/** True if this is visible outside this file, false otherwise */
function isNodeExported(node) {
    return (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0 || (!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile);
}

function logErrors(fileName) {
    var allDiagnostics = services.getCompilerOptionsDiagnostics()
        .concat(services.getSyntacticDiagnostics(fileName))
        .concat(services.getSemanticDiagnostics(fileName));

    var errors = [];
    allDiagnostics.forEach(function (diagnostic) {
        var message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
        if (diagnostic.file) {
            var res = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);

            errors.push({ fileName: diagnostic.file.fileName, line: res.line + 1, character: res.character + 1, message: message });
        }
        else {
            errors.push({ message: message });
        }
    });

    postMessage({ error: true, fileName: fileName, errors: errors })
}

//manual polyfill since babel polyfill is not included in workers
function stringEndsWith(str, end) {
    return str.substring(str.length - end.length, str.length) === end;
}

function stringStartsWith(str, start) {
    return str.substr(0, start.length) === start;
}