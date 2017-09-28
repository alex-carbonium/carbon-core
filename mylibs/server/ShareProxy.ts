// auto-generated with node ./scripts/jsClient.js
import backend from "../backend";
var proxy = {
    getCodes(companyId, projectId) {
        return backend.get(backend.servicesEndpoint + "/api/share/codes", {companyId, projectId});
    },
    addCode(companyId, projectId, role) {
        return backend.post(backend.servicesEndpoint + "/api/share/code", {companyId, projectId, role});
    },
    deleteCode(companyId, projectId, code) {
        return backend.delete(backend.servicesEndpoint + "/api/share/code", {companyId, projectId, code});
    },
    deleteAllCodes(companyId, projectId) {
        return backend.delete(backend.servicesEndpoint + "/api/share/codes", {companyId, projectId});
    },
    mirrorCode(companyId, projectId, enable) {
        return backend.get(backend.servicesEndpoint + "/api/share/mirrorCode", {companyId, projectId, enable});
    },
    disableMirroring(companyId, projectId) {
        return backend.post(backend.servicesEndpoint + "/api/share/disableMirroring", {companyId, projectId});
    },
    invite(companyId, projectId, email, role) {
        return backend.post(backend.servicesEndpoint + "/api/share/invite", {companyId, projectId, email, role});
    },
    use(code) {
        return backend.post(backend.servicesEndpoint + "/api/share/use", {code});
    },
    getPageSetup(pageId: string) {
        return backend.get(backend.servicesEndpoint + "/api/share/pageSetup", {pageId});
    },
    validatePageName(model) {
        return backend.post(backend.servicesEndpoint + "/api/share/validatePageName", {model});
    },
    publishPage(model) {
        return backend.post(backend.servicesEndpoint + "/api/share/publishPage", {model});
    },
    resources(from, to, search = '') {
        return backend.get(backend.servicesEndpoint + "/api/share/resources", { from, to, search });
    }
}

backend.shareProxy = proxy;
export default proxy;