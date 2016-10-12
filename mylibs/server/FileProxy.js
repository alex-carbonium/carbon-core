// auto-generated with node ./scripts/jsClient.js
import backend from "../backend";
export default {
    images: function(companyId){
        return backend.get(backend.servicesEndpoint + "/api/file/images", { companyId });
    },
    upload: function(){
        return backend.post(backend.servicesEndpoint + "/api/file/upload");
    },
    delete: function(companyId, name){
        return backend.post(backend.servicesEndpoint + "/api/file/delete", { companyId, name });
    },
    uploadPublicImage: function (dataUrl) {
        return backend.post(backend.servicesEndpoint + "/api/file/uploadPublicImage", { data:{content:dataUrl} });
    },
    uploadPublicFile: function (content) {
        return backend.post(backend.servicesEndpoint + "/api/file/uploadPublicFile", { data:{content:content} });
    }
}