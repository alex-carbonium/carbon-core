// auto-generated with node ./scripts/jsClient.js
import backend from "../backend";
export default {
    subscribeForFeature: function(companyId, projectId, feature){
        return backend.post(backend.servicesEndpoint + "/api/activity/subscribeForFeature", { companyId, projectId, feature });
    }
}