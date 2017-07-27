import backend from "../backend";

let proxy = {
    subscribeForFeature: function(companyId, projectId, feature){
        return backend.post(backend.servicesEndpoint + "/api/activity/subscribeForFeature", { companyId, projectId, feature });
    },

    subscribeForBeta: function(email){
        return backend.post(backend.servicesEndpoint + "/api/beta/subscribe", { email });
    }
}

backend.activityProxy = proxy;

export default proxy;