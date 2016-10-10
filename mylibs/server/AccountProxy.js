// auto-generated with node ./scripts/jsClient.js
import backend from "../backend";
export default {
    register: function(model){
        return backend.post(backend.servicesEndpoint + "/api/account/register", { model });
    },
    resolveCompanyId: function(companyName){
        return backend.post(backend.servicesEndpoint + "/api/account/resolveCompanyId", { companyName });
    },
    getCompanyName: function(){
        return backend.get(backend.servicesEndpoint + "/api/account/getCompanyName");
    }
}