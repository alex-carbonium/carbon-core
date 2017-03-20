// auto-generated with node ./scripts/jsClient.js
import backend from "../backend";
export default {
    generate: function(fields, rows){
        return backend.get(backend.servicesEndpoint + "/api/data/generate", { fields, rows });
    },
    discover: function(){
        return backend.get(backend.servicesEndpoint + "/api/data/discover");
    }
}