import backend from "../backend";
import globals from "../globals";
import { ISharedResource } from "carbon-core";

var proxy = {
    staticResources(from, to, search?) {
        return backend.get(globals.resourceFile)
            .then(resources => {
                let filtered = filter(resources, search);
                return {
                    pageData: filtered.slice(from, to + 1),
                    totalCount: filtered.length
                }
            });
    }
}

function filter(resources: ISharedResource[], search: string) {
    if (!search) {
        return resources;
    }

    let result = [];
    let regex = new RegExp(search, "gi");

    for (var i = 0; i < resources.length; i++) {
        var r = resources[i];

        regex.lastIndex = 0;
        if (regex.test(r.name)) {
            result.push(r);
            continue;
        }

        regex.lastIndex = 0;
        if (regex.test(r.description)) {
            result.push(r);
            continue;
        }

        for (var j = 0; j < r.tags.length; j++) {
            var tag = r.tags[j];
            regex.lastIndex = 0;
            if (regex.test(tag)) {
                result.push(r);
                break;
            }
        }
    }

    return result;
}

backend.staticResourcesProxy = proxy;
export default proxy;