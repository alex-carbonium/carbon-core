import DataNode from "../DataNode";
import backend from "../../backend";
import { PrimitiveType, IPrimitive, PrimitiveKind } from "carbon-core";
import { createUUID } from "../../util";

var Primitive: any = {};

Primitive._externalMap = {};
Primitive._localMap = {};

Primitive.speculativeEquals = function (p1, p2) {
    if (!p1 || !p2) {
        return false;
    }
    if (p1.type !== p2.type){
        return false;
    }

    if (p1.path.length !== p2.path.length){
        return false;
    }
    for (let i = p1.path.length - 1; i >= 0; --i){
        var s1 = p1.path[i];
        var s2 = p2.path[i];
        if (s1 !== s2){
            return false;
        }
    }

    switch (p1.type){
        case PrimitiveType.DataNodeSetProps:
            var keys1 = Object.keys(p1.props);
            var keys2 = Object.keys(p2.props);
            if (keys1.length != keys2.length){
                return false;
            }
            for (let i = 0; i < keys1.length; i++){
                var key1 = keys1[i];
                var key2 = keys2[i];
                if (key1 !== key2){
                    return false;
                }
            }
            return true;
    }

    return false;
};
Primitive.speculativeIndexOf = function(array, p){
    for (var i = 0; i < array.length; i++){
        var p2 = array[i];
        if (this.speculativeEquals(p, p2)){
            return i;
        }
    }
    return -1;
};

Primitive.dataNodeAdd = function(parent, element, index, norollback) {
    var res: PrimitiveKind = {
        id: createUUID(),
        sessionId: backend.sessionId,
        time: new Date().getTime(),
        type: PrimitiveType.DataNodeAdd,
        path: parent.primitivePath(),
        node: element.toJSON(),
        index: index
    };

    if (!norollback) {
        res._rollbackData = Primitive.dataNodeRemove(parent, element, index, true);
    }

    return res;
};

Primitive.dataNodeRemove = function(parent, element, index, norollback) {
    var res: PrimitiveKind = {
        id: createUUID(),
        sessionId: backend.sessionId,
        time: new Date().getTime(),
        type: PrimitiveType.DataNodeRemove,
        path: parent.primitivePath(),
        childId: element.id()
    };

    if (!norollback) {
        res._rollbackData = Primitive.dataNodeAdd(parent, element, index, true);
    }

    return res;
};

Primitive.dataNodeSetProps = function(element, props, oldProps, norollback) {
    var res: PrimitiveKind = {
        id: createUUID(),
        sessionId: backend.sessionId,
        time: new Date().getTime(),
        type: PrimitiveType.DataNodeSetProps,
        path: element.primitivePath(),
        props: props
    };

    if (!norollback) {
        res._rollbackData = Primitive.dataNodeSetProps(element, oldProps, null, true);
    }

    return res;
};

Primitive.selection = function(page, selection, oldSelection, userId, norollback) {
    var res: PrimitiveKind = {
        id: createUUID(),
        sessionId: backend.sessionId,
        time: new Date().getTime(),
        type: PrimitiveType.Selection,
        path: page.primitivePath(),
        userId: userId,
        selection: selection
    };

    if (!norollback) {
        res._rollbackData = Primitive.selection(page, oldSelection || [], null, userId, true);
    }

    return res;
};

//TODO: view primitive should store the viewport, so that it can be synchronized between clients with different screen size
Primitive.view = function(page, newState, oldState, norollback) {
    var res: PrimitiveKind = {
        id: createUUID(),
        sessionId: backend.sessionId,
        time: new Date().getTime(),
        type: PrimitiveType.View,
        path: page.primitivePath(),
        newState,
        oldState
    };

    if (!norollback) {
        res._rollbackData = Primitive.view(page, oldState, newState, true);
    }

    return res;
};

Primitive.dataNodePatchProps = function(element, patchType, propName){
    var res: PrimitiveKind = {
        id: createUUID(),
        sessionId: backend.sessionId,
        time: new Date().getTime(),
        type: PrimitiveType.DataNodePatchProps,
        patchType,
        path: element.primitivePath(),
        propName,
        item: null
    };

    return res;
};

Primitive.dataNodeChange = function(element, oldJson, norollback) {
    var res: PrimitiveKind = {
        id: createUUID(),
        sessionId: backend.sessionId,
        time: new Date().getTime(),
        type: PrimitiveType.DataNodeChange,
        path: element.primitivePath(),
        node: element.toJSON()
    };

    if (!norollback) {
        res._rollbackData = {
            id: createUUID(),
            sessionId: backend.sessionId,
            time: new Date().getTime(),
            type: PrimitiveType.DataNodeChange,
            path: element.primitivePath(),
            node: oldJson
        };
    }

    return res;
};

Primitive.dataNodeChangePosition = function(parent, element, newPosition, oldPosition, norollback) {
    var res: PrimitiveKind = {
        id: createUUID(),
        sessionId: backend.sessionId,
        time: new Date().getTime(),
        type: PrimitiveType.DataNodeChangePosition,
        path: parent.primitivePath(),
        childId: element.id(),
        newPosition
    };

    if (!norollback) {
        res._rollbackData = {
            id: createUUID(),
            sessionId: backend.sessionId,
            time: new Date().getTime(),
            type: PrimitiveType.DataNodeChangePosition,
            path: parent.primitivePath(),
            childId: element.id(),
            newPosition: oldPosition
        };
    }

    return res;
};

Primitive.no_op = function () {
    return {};
};

export default Primitive;