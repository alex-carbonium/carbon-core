import logger from "../../logger";
import ModelStateListener from "./ModelStateListener";
import { IPrimitive, NodePrimitivesMap, IPrimitiveRoot, IUIElement, IDataNode, Primitive } from "carbon-core";

/**
 * Contains primitives to be procecessed during next relayout of the corresponding root.
 * Both external and local (undo, redo) primitives could be stored in the queue.
 */
class RelayoutQueue {
    private data: {[key: string]: NodePrimitivesMap} = {};

    enqueue(p: Primitive){
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

        var rootData = this.data[key];
        if (!rootData){
            rootData = {};
            this.data[key] = rootData;
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
    }

    enqueueAll(primitives: Primitive[]){
        primitives.forEach(x => this.enqueue(x));
    }

    dequeue(root: IPrimitiveRoot & IDataNode){
        var key = root.primitiveRootKey();
        var rootData = this.data[key];
        if (!rootData){
            return null;
        }
        delete this.data[key];
        return rootData;
    }
}

export default new RelayoutQueue();