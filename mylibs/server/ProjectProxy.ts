// auto-generated with node ./scripts/jsClient.js
import backend from "../backend";
let proxy = {
    getModel(companyId, modelId){
        return backend.get(backend.servicesEndpoint + "/api/project/model", { companyId, modelId });
    }
}
backend.projectProxy = proxy;
export default proxy;