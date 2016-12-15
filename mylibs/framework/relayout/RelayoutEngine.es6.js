import DeferredPrimitives from "../sync/DeferredPrimitives";
import PrimitiveHandler from "../sync/Primitive_Handlers";
import {formatPrimitive} from "../../util";
import {ChangeMode} from "../Defs";

var debug = require("DebugUtil")("carb:relayoutEngine");

//TODO: each element must define clipping boundary in relayout loop
//TODO: global matrix must be calculated in relayout loop
//TODO: global rect must be calculated in relayout loop

export default class RelayoutEngine {

    static run2(root, propsHistoryMap, filter = null) {
        var primitiveMap = DeferredPrimitives.releasePrimitiveMap(root);
        return RelayoutEngine._visitElement2(root, propsHistoryMap, primitiveMap, filter);
    }

    static _visitElement2(element, propsHistoryMap, primitiveMap, filter) {
        //var oldRect;
        var primitives = null;
        var hasChildren = !!element.children;
        var canArrange = primitiveMap === null;

        if (hasChildren) {
            var items = element.children;
            for (let i = 0, l = items.length; i < l; ++i) {
                if (filter !== null && filter(items[i]) === false){
                    continue;
                }
                let res = RelayoutEngine._visitElement2(items[i], propsHistoryMap, primitiveMap, filter);
                if (res !== null){
                    if (primitives === null){
                        primitives = [];
                    }
                    Array.prototype.push.apply(primitives, res);
                }
            }

            //var entry = propsHistoryMap[element.id()];
            //if (entry) {
                //var oldProps = entry.props;
                //if (oldProps) {
                    // oldRect = {
                    //     x: oldProps.x !== undefined ? oldProps.x : element.x(),
                    //     y: oldProps.y !== undefined ? oldProps.y : element.y(),
                    //     width: oldProps.width !== undefined ? oldProps.width : element.width(),
                    //     height: oldProps.height !== undefined ? oldProps.height : element.height()
                    // };
                //}
            //}
            // if (!oldRect) {
            //     oldRect = element.getBoundaryRect();
            // }
        }

        let res = RelayoutEngine.applyPrimitives(element, propsHistoryMap, primitiveMap, filter);
        if (res !== null){
            if (primitives === null){
                primitives = [];
            }
            Array.prototype.push.apply(primitives, res);
        }

        if (hasChildren && canArrange){
            //debug("arrange %s (%s)", element.displayName(), element.id());
            //element.performArrange(oldRect, element.runtimeProps.lastTransformOrigin || element.getBoundingBox());
        }
        return primitives;
    }

    static applyPrimitives(element, propHistoryMap, primitiveMap, filter){
        if (!primitiveMap){
            return null;
        }
        var primitives = primitiveMap[element.id()];
        if(!primitives) {
            return null;
        }

        var newElements = null;

        debug("applyPrimitives for %s (%s)", element.displayName(), element.id());

        for(var i = 0; i < primitives.length; ++i) {
            var primitive = primitives[i];
            formatPrimitive(primitive, debug, 'External');
            var newElement = PrimitiveHandler.handle(element, primitive);
            if (newElement){
                if (!newElements){
                    newElements = [];
                }
                newElements.push(newElement);
            }
        }

        if (newElements){
            for (let i = 0, l = newElements.length; i < l; ++i) {
                let res = RelayoutEngine._visitElement2(newElements[i], propHistoryMap, primitiveMap, filter);
                if (res !== null){
                    Array.prototype.push.apply(primitives, res);
                }
            }
        }

        return primitives;
    }
}