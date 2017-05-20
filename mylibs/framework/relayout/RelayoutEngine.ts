import DeferredPrimitives from "../sync/DeferredPrimitives";
import ModelStateListener from "../sync/ModelStateListener";
import PrimitiveHandler from "../sync/Primitive_Handlers";

var debug = require("DebugUtil")("carb:relayoutEngine");

//TODO: each element must define clipping boundary in relayout loop
//TODO: global matrix must be calculated in relayout loop
//TODO: global rect must be calculated in relayout loop

export default class RelayoutEngine {

    static run(root, propsHistoryMap, filter = null) {
        var primitiveMap = DeferredPrimitives.releasePrimitiveMap(root);
        var shouldArrange = ModelStateListener.isRelayoutNeeded(root);
        var res = RelayoutEngine.visitElement(root, primitiveMap, propsHistoryMap, shouldArrange, filter);

        if(primitiveMap) {
            App.Current.deferredChange.raise(primitiveMap);
        }
    }

    static visitElement(element, primitiveMap, propsHistoryMap, shouldArrange, filter) {
        // var oldRect;
        var primitives = null;
        var hasChildren = !!element.children;

        if (hasChildren) {
            var items = element.children;
            for (let i = 0, l = items.length; i < l; ++i) {
                if (filter !== null && filter(items[i]) === false) {
                    continue;
                }
                let res = RelayoutEngine.visitElement(items[i], primitiveMap, propsHistoryMap, shouldArrange, filter);
                if (res !== null) {
                    if (primitives === null) {
                        primitives = [];
                    }
                    Array.prototype.push.apply(primitives, res);
                }
            }

            // var entry = propsHistoryMap[element.id()];
            // if (entry && entry.props) {
            //     oldRect = entry.props.br;
            // }
            // if (!oldRect) {
            //     oldRect = element.getBoundaryRect();
            // }
        }

        let res = RelayoutEngine.applyPrimitives(element, primitiveMap, propsHistoryMap, shouldArrange, filter);
        if (res !== null) {
            if (primitives === null) {
                primitives = [];
            }
            Array.prototype.push.apply(primitives, res);
        }

        if (hasChildren && shouldArrange) {
            debug("** arrange %s (%s)", element.displayName(), element.id());
            //some bugs are here with contraints being applied twice, disabling for now
            //this only arranges up, arrange down is done in applyScaling
            element.performArrange(/*{oldRect}, ChangeMode.Model*/);
        }
        return primitives;
    }


    static applyPrimitives(element, primitiveMap, propsHistoryMap, shouldArrange, filter) {
        if (!primitiveMap) {
            return null;
        }
        var primitives = primitiveMap[element.id()];
        if (!primitives) {
            return null;
        }

        var newElements = null;

        debug("applyPrimitives for %s (%s)", element.displayName(), element.id());

        for (var i = 0; i < primitives.length; ++i) {
            var primitive = primitives[i];
            var newElement = PrimitiveHandler.handle(element, primitive);
            if (newElement) {
                if (!newElements) {
                    newElements = [];
                }
                newElements.push(newElement);
            }
        }

        if (newElements) {
            for (let i = 0, l = newElements.length; i < l; ++i) {
                let res = RelayoutEngine.visitElement(newElements[i], primitiveMap, propsHistoryMap, shouldArrange, filter);
                if (res !== null) {
                    Array.prototype.push.apply(primitives, res);
                }
            }
        }

        return primitives;
    }
}