// auto-generated with node ./scripts/jsClient.js
import backend from "../backend";
var proxy = {
    resources(from, to, search = '') {
        return backend.get(backend.servicesEndpoint + "/api/gallery/resources", { from, to, search });
    },
    resource(id) {
        return backend.get(backend.servicesEndpoint + "/api/gallery/resource", { id });
    }
}

backend.galleryProxy = proxy;
export default proxy;