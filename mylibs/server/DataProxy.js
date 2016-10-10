import backend from "../backend";
export default {
    generate: function(fields, rowCount){
        var query = backend.encodeUriData({key: "26d60d80", count: rowCount, array: true});
        var data = fields.map(x => {return {name: x, type: x}});
        return backend.post(backend.servicesEndpoint + "/api/proxy?http://www.mockaroo.com/api/generate.json?" + query, data);
    }
}