// auto-generated with node ./scripts/jsClient.js
import backend from "../backend";
var proxy = {
    overview(){
        return backend.get(backend.servicesEndpoint + "/api/account/overview");
    },
    updateAccountInfo(model){
        return backend.post(backend.servicesEndpoint + "/api/account/info", { model });
    },
    changePassword(model){
        return backend.post(backend.servicesEndpoint + "/api/account/changePassword", { model });
    },
    addPassword(model){
        return backend.post(backend.servicesEndpoint + "/api/account/addPassword", { model });
    },
    register(model){
        return backend.post(backend.servicesEndpoint + "/api/account/register", { model });
    },
    resolveCompanyId(companyName){
        return backend.post(backend.servicesEndpoint + "/api/account/resolveCompanyId", { companyName });
    },
    getCompanyName(){
        return backend.get(backend.servicesEndpoint + "/api/account/getCompanyName");
    },
    validateEmail(model){
        return backend.post(backend.servicesEndpoint + "/api/account/validateEmail", { model });
    },
    forgotPassword(model){
        return backend.post(backend.servicesEndpoint + "/api/account/forgotPassword", { model });
    },
    resetPassword(model){
        return backend.post(backend.servicesEndpoint + "/api/account/resetPassword", { model });
    }
}

backend.accountProxy = proxy;
export default proxy;