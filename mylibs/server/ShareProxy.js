// auto-generated with node ./scripts/jsClient.js
import backend from "../backend";
export default {
    code: function (companyId, projectId, role) {
        return backend.get(backend.servicesEndpoint + "/api/share/code", {companyId, projectId, role});
    },
    mirrorCode: function (companyId, projectId, enable) {
        return backend.get(backend.servicesEndpoint + "/api/share/mirrorCode", {companyId, projectId, enable});
    },
    disableMirroring: function (companyId, projectId) {
        return backend.post(backend.servicesEndpoint + "/api/share/disableMirroring", {companyId, projectId});
    },
    invite: function (companyId, projectId, email, role) {
        return backend.post(backend.servicesEndpoint + "/api/share/invite", {companyId, projectId, email, role});
    },
    use: function (code) {
        return backend.post(backend.servicesEndpoint + "/api/share/use", {code});
    },
    publish: function (name, description, tags, pageData, previewPicture, isPublic) {
        return backend.post(backend.servicesEndpoint + "/api/share/publishPage", {
            name: name || ''
            , description: description || ''
            , tags: tags || ''
            , isPublic: !!isPublic
            , pageData: JSON.stringify(pageData)
            , previewPicture: previewPicture
        });
    },
    resources: function (search) {
        return backend.get(backend.servicesEndpoint + "/api/share/resources", {
            search: search || ''
        });
    }
}