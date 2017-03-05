var fs = require("fs");
var path = require("path");
var Promise = require("bluebird");

generateApi('http://127.0.0.1:9000/api/swagger/docs/v1', 'servicesEndpoint');
generateApi('http://127.0.0.1:9100/api/swagger/docs/v1', 'storageEndpoint');

function generateApi(url, endpoint){
    var Swagger = require('swagger-client');
    var Mustache = require('mustache');
    var template = fs.readFileSync(path.join(__dirname, 'jsapi.mst'), 'utf-8');
    return new Promise(function(resolve){
        new Swagger({
            url: url,
            success: function() {
                for (var controllerName in this.apis){
                    var controller = this.apis[controllerName];
                    if (typeof controller === 'object'){
                        var model = createControllerModel(controller);
                        model.endpoint = endpoint;
                        var module = Mustache.render(template, model);
                        var modulePath = path.join(__dirname, '../mylibs/server', controllerName + 'Proxy.js');
                        console.log('Writing', modulePath);
                        fs.writeFileSync(modulePath, module, {encoding: 'utf-8'});
                    }
                }
                resolve();
            }
        });
    })
}

function createControllerModel(controller){
    var model = {operations: []};
    for (var actionName in controller.apis){
        var api = controller.apis[actionName];
        model.operations.push({
            name: actionName,
            method: api.method,
            url: api.basePath + api.path,
            paramString: api.operation.parameters.map(x => x.name).join(", "),
            paramList: createParamsList(api.operation.parameters)
        });
    }

    model.operations[model.operations.length - 1].isLast = true;

    return model;
}

function createParamsList(parameters){
    var list = [];
    for (var i = 0; i < parameters.length; i++){
        var p = parameters[i];
        if (p.required){
            list.push(p.name);
        }
        else{
            var s = p.name + ' = ';
            switch (p.type){
                case "integer":
                    s += p.default;
                    break;
                case "string":
                    s += "'" + p.default + "'";
                    break;
            }
            list.push(s);
        }
    }
    return list.join(', ');
}