// auto-generated with node ./scripts/jsClient.js
import backend from "../backend";
export default {
    system: function(pageNumber = 1){
        return backend.get(backend.storageEndpoint + "/api/fonts/system", { pageNumber });
    },
    search: function(query, pageNumber = 1){
        return backend.get(backend.storageEndpoint + "/api/fonts/search", { query, pageNumber });
    }
}