import {UAParser} from "ua-parser-js";

//TODO: platform should parse userAgent and queryString, params should use platform
interface IQueryStringParams{
    backend?: string;
    clearStorage?: boolean;
    serverless?: boolean;
}

function parseQueryString(): IQueryStringParams{
    var search = location.search.substring(1);
    var result: IQueryStringParams = {};
    if (search){
        var split = search.split("&");
        for (var i = 0; i < split.length; ++i){
            var parts = split[i].split("=");
            if (parts.length > 0){
                result[decodeURIComponent(parts[0])] = parts[1] ? decodeURIComponent(parts[1]) : true;
            }
        }
    }
    return result;
}

var parser = new UAParser(navigator.userAgent);

if (!window['sketch']){
    window['sketch'] = {};
}

window['sketch'].params = {
    projectType: "WebProject"
};

var endpoints = window['endpoints'];
var qs = parseQueryString();
if (DEBUG){
    if (qs.backend === "dev"){
        endpoints = {
            services: '//dev.carbonium.io',
            storage: '//dev.carbonium.io:9100',
            cdn: '//carbonstatic.azureedge.net',
            file: '//carbonstorageqa1.blob.core.windows.net/'
        }
    }
    else{
        if (!endpoints){
            endpoints = {};
        }
        endpoints.services = endpoints.services || "//"+ window.location.hostname + ":9000";
        endpoints.storage = endpoints.storage || "//"+ window.location.hostname + ":9100";
        endpoints.file = endpoints.file || "//127.0.0.1:10000/devstoreaccount1";
        //endpoints.cdn = '//carbonstatic.azureedge.net';
    }
}

export default {
    deviceType: parser.getDevice().type || "Computer",
    deviceOS: parser.getOS().name,
    browser: parser.getBrowser(),
    transport: "auto",
    endpoints: endpoints,
    serveless: qs.serverless,
    clearStorage: qs.clearStorage
};