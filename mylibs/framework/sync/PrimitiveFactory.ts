import DataNode from "../DataNode";
import backend from "../../backend";
import { PrimitiveType, IPrimitive, Primitive, IJsonNode, IDataNode, AppSettings } from "carbon-core";
import { createUUID } from "../../util";

class PrimitiveFactory {
    private _externalMap = {};
    private _localMap = {};

    speculativeEquals(p1, p2) {
        if (!p1 || !p2) {
            return false;
        }
        if (p1.type !== p2.type) {
            return false;
        }

        if (p1.path.length !== p2.path.length) {
            return false;
        }
        for (let i = p1.path.length - 1; i >= 0; --i) {
            var s1 = p1.path[i];
            var s2 = p2.path[i];
            if (s1 !== s2) {
                return false;
            }
        }

        switch (p1.type) {
            case PrimitiveType.DataNodeSetProps:
                var keys1 = Object.keys(p1.props);
                var keys2 = Object.keys(p2.props);
                if (keys1.length != keys2.length) {
                    return false;
                }
                for (let i = 0; i < keys1.length; i++) {
                    var key1 = keys1[i];
                    var key2 = keys2[i];
                    if (key1 !== key2) {
                        return false;
                    }
                }
                return true;
        }

        return false;
    }
    speculativeIndexOf(array, p) {
        for (var i = 0; i < array.length; i++) {
            var p2 = array[i];
            if (this.speculativeEquals(p, p2)) {
                return i;
            }
        }
        return -1;
    }

    dataNodeAdd(parent: IDataNode, element: IDataNode, index: number, norollback?: boolean) {
        var res: Primitive = {
            id: createUUID(),
            sessionId: backend.sessionId,
            time: new Date().getTime(),
            type: PrimitiveType.DataNodeAdd,
            path: parent.primitivePath(),
            node: element.toJSON(),
            index: index
        }

        if (!norollback) {
            res._rollbackData = this.dataNodeRemove(parent, element, index, true);
        }

        return res;
    }

    dataNodeRemove(parent: IDataNode, element: IDataNode, index: number, norollback?: boolean) {
        var res: Primitive = {
            id: createUUID(),
            sessionId: backend.sessionId,
            time: new Date().getTime(),
            type: PrimitiveType.DataNodeRemove,
            path: parent.primitivePath(),
            childId: element.id()
        }

        if (!norollback) {
            res._rollbackData = this.dataNodeAdd(parent, element, index, true);
        }

        return res;
    }

    dataNodeSetProps(element, props, oldProps, norollback?) {
        var res: Primitive = {
            id: createUUID(),
            sessionId: backend.sessionId,
            time: new Date().getTime(),
            type: PrimitiveType.DataNodeSetProps,
            path: element.primitivePath(),
            props: props
        }

        if (!norollback) {
            res._rollbackData = this.dataNodeSetProps(element, oldProps, null, true);
        }

        return res;
    }

    selection(page, selection, oldSelection, userId, norollback?) {
        var res: Primitive = {
            id: createUUID(),
            sessionId: backend.sessionId,
            time: new Date().getTime(),
            type: PrimitiveType.Selection,
            path: page.primitivePath(),
            userId: userId,
            selection: selection
        }

        if (!norollback) {
            res._rollbackData = this.selection(page, oldSelection || [], null, userId, true);
        }

        return res;
    }

    //TODO: view primitive should store the viewport, so that it can be synchronized between clients with different screen size
    view(page, newState, oldState, norollback?) {
        var res: Primitive = {
            id: createUUID(),
            sessionId: backend.sessionId,
            time: new Date().getTime(),
            type: PrimitiveType.View,
            path: page.primitivePath(),
            newState,
            oldState
        }

        if (!norollback) {
            res._rollbackData = this.view(page, oldState, newState, true);
        }

        return res;
    }

    dataNodePatchProps(element, patchType, propName) {
        var res: Primitive = {
            id: createUUID(),
            sessionId: backend.sessionId,
            time: new Date().getTime(),
            type: PrimitiveType.DataNodePatchProps,
            patchType,
            path: element.primitivePath(),
            propName,
            item: null
        }

        return res;
    }

    dataNodeChange(element, oldJson, norollback?) {
        var res: Primitive = {
            id: createUUID(),
            sessionId: backend.sessionId,
            time: new Date().getTime(),
            type: PrimitiveType.DataNodeChange,
            path: element.primitivePath(),
            node: element.toJSON()
        }

        if (!norollback) {
            res._rollbackData = {
                id: createUUID(),
                sessionId: backend.sessionId,
                time: new Date().getTime(),
                type: PrimitiveType.DataNodeChange,
                path: element.primitivePath(),
                node: oldJson
            }
        }

        return res;
    }

    dataNodeChangePosition(parent, element, newPosition, oldPosition, norollback?) {
        var res: Primitive = {
            id: createUUID(),
            sessionId: backend.sessionId,
            time: new Date().getTime(),
            type: PrimitiveType.DataNodeChangePosition,
            path: parent.primitivePath(),
            childId: element.id(),
            newPosition
        }

        if (!norollback) {
            res._rollbackData = {
                id: createUUID(),
                sessionId: backend.sessionId,
                time: new Date().getTime(),
                type: PrimitiveType.DataNodeChangePosition,
                path: parent.primitivePath(),
                childId: element.id(),
                newPosition: oldPosition
            }
        }

        return res;
    }

    projectSettingsChange(companyId: string, projectId: string, settings: AppSettings) {
        var res: Primitive = {
            id: createUUID(),
            sessionId: backend.sessionId,
            time: new Date().getTime(),
            type: PrimitiveType.ProjectSettingsChange,
            path: [],
            companyId: companyId,
            projectId: projectId,
            settings
        }

        return res;
    }

    no_op() {
        return {}
    }
}

export const primitiveFactory = new PrimitiveFactory();