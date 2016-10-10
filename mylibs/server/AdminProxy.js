// auto-generated with node ./scripts/jsClient.js
import backend from "../backend";
export default {
    projectModel: function(companyId, modelId){
        return backend.get(backend.storageEndpoint + "/api/admin/projectModel", { companyId, modelId });
    }
}