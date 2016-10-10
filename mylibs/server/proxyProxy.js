// auto-generated with node ./scripts/jsClient.js
import backend from "../backend";
export default {
    proxy: function(){
        return backend.get(backend.servicesEndpoint + "/api/proxy");
    },
    proxy_0: function(){
        return backend.post(backend.servicesEndpoint + "/api/proxy");
    }
}