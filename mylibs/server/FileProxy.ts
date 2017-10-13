// auto-generated with node ./scripts/jsClient.js
import backend from "../backend";
let proxy = {
    images(companyId){
        return backend.get(backend.servicesEndpoint + "/api/file/images", { companyId });
    },
    upload(){
        return backend.post(backend.servicesEndpoint + "/api/file/upload");
    },
    uploadUrl(model) {
        return backend.post(backend.servicesEndpoint + "/api/file/uploadUrl", { model });
    },
    delete(companyId, name){
        return backend.post(backend.servicesEndpoint + "/api/file/delete", { companyId, name });
    },
    uploadPublicImage(model) {
        return backend.post(backend.servicesEndpoint + "/api/file/uploadPublicImage", { model });
    },
    uploadPublicFile(model) {
        return backend.post(backend.servicesEndpoint + "/api/file/uploadPublicFile", { model });
    }
}
backend.fileProxy = proxy;
export default proxy;