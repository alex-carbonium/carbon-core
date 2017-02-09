import logger from "../../logger";
import ModelStateListener from "./ModelStateListener";

export default {
    _data: {},
    register: function(p){
        var path = p.path;
        //[] -> app
        //page id, page id
        //page id, elementid
        //page id, artboard id, artboard
        //page id, artboard id, element id
        var key;
        if (path.length === 0){
            key = '';
        }
        else if (path.length === 2){
            key = path[0];
        }
        else if (path.length <= 4){
            key = path[0] + path[1];
        }
        else{
            logger.error("Unexpected primitive path", p);
            return;
        }

        var rootData = this._data[key];
        if (!rootData){
            rootData = {};
            this._data[key] = rootData;
        }
        var elementId = p.path.length ? p.path[p.path.length - 1] : '';
        var primitives = rootData[elementId];
        if (!primitives){
            primitives = [];
            rootData[elementId] = primitives;
        }
        primitives.push(p);

        ModelStateListener.touchRoot(key);
        return key;
    },
    releasePrimitiveMap: function(root){
        var key = root.primitiveRootKey();
        var rootData = this._data[key];
        if (!rootData){
            return null;
        }
        delete this._data[key];
        return rootData;
    }
}