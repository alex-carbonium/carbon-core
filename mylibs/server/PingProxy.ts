// auto-generated with node ./scripts/jsClient.js
import backend from "../backend";
export default {
    ping: function(){
        return backend.get(backend.servicesEndpoint + "/api/ping");
    },
    exception: function(){
        return backend.get(backend.servicesEndpoint + "/api/exception");
    }
}