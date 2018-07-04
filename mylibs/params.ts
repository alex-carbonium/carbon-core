import {UAParser} from "ua-parser-js";
import { Platform, StartupParams, DeviceType, DeviceOS, Browser } from "carbon-api";

//TODO: platform should parse userAgent and queryString, params should use platform
interface IQueryStringParams{
    backend?: string;
    cls?: boolean;
    serverless?: boolean;
    perf?:boolean;
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

const RealCdn = '//carbonstatic.azureedge.net';
var endpoints = window['endpoints'];
var qs = parseQueryString();
if (DEBUG){
    if (qs.backend === "dev"){
        endpoints = {
            services: '//dev.carbonium.io',
            storage: '//dev.carbonium.io:9100',
            cdn: RealCdn,
            file: '//carbonstorageqa1.blob.core.windows.net/',
            error: 'https://carbon-functions-qa1.azurewebsites.net/api/trackError'
        }
    }
    else if (qs.backend === "prod"){
        endpoints = {
            services: '//carbonium.io',
            storage: '//carbonium.io:9100',
            cdn: RealCdn,
            file: '//carbonstorageqa1.blob.core.windows.net/',
            error: 'https://carbon-functions-qa1.azurewebsites.net/api/trackError'
        }
    }
    else{
        if (!endpoints){
            endpoints = {};
        }
        endpoints.services = endpoints.services || "//"+ location.hostname + ":9000";
        endpoints.storage = endpoints.storage || "//"+ location.hostname + ":9100";
        endpoints.file = endpoints.file || "//127.0.0.1:10000/devstoreaccount1";
        endpoints.error = "";
    }
}

let browser = parser.getBrowser();
export default {
    deviceType: parser.getDevice().type as DeviceType,
    deviceOS: parser.getOS().name as DeviceOS,
    browser: {
        name: browser.name as Browser,
        version: browser.version,
        major: browser.major
    },
    transport: "auto",
    endpoints: endpoints,
    serveless: qs.serverless,
    clearStorage: qs.cls,
    perf: qs.perf,
    realCdn: RealCdn
} as Platform & StartupParams; //TODO: split platform