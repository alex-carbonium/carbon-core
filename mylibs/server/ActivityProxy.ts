import backend from "../backend";

let proxy = {
    subscribeForFeature: function(companyId, projectId, feature){
        return backend.post(backend.servicesEndpoint + "/api/activity/subscribeForFeature", { companyId, projectId, feature });
    }
}

backend.activityProxy = proxy;

export default proxy;