// auto-generated with node ./scripts/jsClient.js
import backend from "../backend";
let proxy = {
    system: function(pageNumber = 1){
        return backend.get(backend.servicesEndpoint + "/api/fonts/system", { pageNumber });
    },
    search: function(query, pageNumber = 1){
        return backend.get(backend.servicesEndpoint + "/api/fonts/search", { query, pageNumber });
    }
}

backend.fontsProxy = proxy;
export default proxy;