// auto-generated with node ./scripts/jsClient.js
import backend from "../backend";
var proxy = {
    resources(from, to, search = '') {
        return backend.get(backend.servicesEndpoint + "/api/gallery/resources", { from, to, search });
    },
    resource(id) {
        return backend.get(backend.servicesEndpoint + "/api/gallery/resource", { id });
    },
    trackPrivateResourceUsed(companyId: string, resourceId: string) {
        return backend.post(backend.servicesEndpoint + "/api/gallery/trackPrivateResourceUsed", { companyId, resourceId });
    },
    trackPublicResourceUsed(resourceId: string) {
        return backend.post(backend.servicesEndpoint + "/api/gallery/trackPublicResourceUsed", { resourceId });
    }
}

backend.galleryProxy = proxy;
export default proxy;