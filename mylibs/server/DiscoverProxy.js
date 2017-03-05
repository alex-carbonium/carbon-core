// auto-generated with node ./scripts/jsClient.js
import backend from "../backend";
export default {
    projectHub: function(companyId, projectId){
        return backend.get(backend.servicesEndpoint + "/api/discover/projectHub", { companyId, projectId });
    }
}