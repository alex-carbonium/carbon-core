// auto-generated with node ./scripts/jsClient.js
import backend from "../backend";
export default {
    dashboard: function(companyId){
        return backend.get(backend.servicesEndpoint + "/api/dashboard", { companyId });
    },

    deleteProject: function(companyId, projectId){
        return backend.get(backend.servicesEndpoint + "/api/dashboard/deleteproject", { companyId, projectId });
    }
}