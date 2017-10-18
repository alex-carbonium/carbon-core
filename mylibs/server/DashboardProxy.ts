// auto-generated with node ./scripts/jsClient.js
import backend from "../backend";
let proxy = {
    dashboard: function(companyId){
        return backend.get(backend.servicesEndpoint + "/api/dashboard", { companyId });
    },

    deleteProject: function(companyId, projectId){
        return backend.get(backend.servicesEndpoint + "/api/dashboard/deleteProject", { companyId, projectId });
    },

    duplicateProject: function(companyId, projectId){
        return backend.post(backend.servicesEndpoint + "/api/dashboard/duplicateProject", { companyId, projectId });
    }
}
backend.dashboardProxy = proxy;
export default proxy;