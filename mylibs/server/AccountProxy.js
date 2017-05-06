// auto-generated with node ./scripts/jsClient.js
import backend from "../backend";
var proxy = {
    overview: function(){
        return backend.get(backend.servicesEndpoint + "/api/account/overview");
    },
    updateAccountInfo: function(model){
        return backend.post(backend.servicesEndpoint + "/api/account/info", { model });
    },
    changePassword: function(model){
        return backend.post(backend.servicesEndpoint + "/api/account/changePassword", { model });
    },
    addPassword: function(model){
        return backend.post(backend.servicesEndpoint + "/api/account/addPassword", { model });
    },
    register: function(model){
        return backend.post(backend.servicesEndpoint + "/api/account/register", { model });
    },
    resolveCompanyId: function(companyName){
        return backend.post(backend.servicesEndpoint + "/api/account/resolveCompanyId", { companyName });
    },
    getCompanyName: function(){
        return backend.get(backend.servicesEndpoint + "/api/account/getCompanyName");
    },
    validateEmail: function(model){
        return backend.post(backend.servicesEndpoint + "/api/account/validateEmail", { model });
    }
}

backend.accountProxy = proxy;
export default proxy;