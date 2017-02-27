import {PrimitiveType} from "../Defs";

var Primitive = {};


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
    var res = {
        type: PrimitiveType.DataNodeAdd,
        path: parent.primitivePath(),
        node: element.toJSON(),
        index: index
    };

    if (!norollback) {
        res._rollbackData = Primitive.dataNodeRemove(parent, element, index, true);
    }

    if (DEBUG){
        res.toString = function(){
            return "ADD parent=" + this.path[this.path.length - 1] + " child=" + this.node.type + " (" + this.node.props.id + ")";
        }
    }

    return res;
};

Primitive.dataNodeRemove = function(parent, element, index, norollback) {
    var res = {
        type: PrimitiveType.DataNodeRemove,
        path: parent.primitivePath(),
        childId: element.id()
    };

    if (!norollback) {
        res._rollbackData = Primitive.dataNodeAdd(parent, element, index, true);
    }

    if (DEBUG){
        res.toString = function(){
            return "REMOVE parent=" + this.path[this.path.length - 1] + " child=" + this.childId;
        }
    }

    return res;
};

Primitive.dataNodeSetProps = function(element, props, oldProps, norollback) {
    var res = {
        type: PrimitiveType.DataNodeSetProps,
        path: element.primitivePath(),
        props: props
    };

    if (!norollback) {
        res._rollbackData = Primitive.dataNodeSetProps(element, oldProps, null, true);
    }

    if (DEBUG){
        res.toString = function(){
            return "SET PROPS node=" + this.path[this.path.length - 1] + " props=" + JSON.stringify(this.props);
        }
    }

    return res;
};

Primitive.selection = function(page, selection, oldSelection, userId, norollback) {
    var res = {
        type: PrimitiveType.Selection, 
        path: page.primitivePath(),
        userId: userId,
        selection: selection
    };

    if (!norollback) {
        res._rollbackData = Primitive.selection(page, oldSelection || [], null, userId, true);
    }

    if (DEBUG){
        res.toString = function(){
            return "SELECTION page=" + page.name() + " ids=" + JSON.stringify(selection);
        }
    }

    return res;
};

Primitive.dataNodePatchProps = function(element, patchType, propName){
    var res = {
        type: PrimitiveType.DataNodePatchProps,
        patchType,
        path: element.primitivePath(),
        propName
    };

    if (DEBUG){
        res.toString = function(){
            return "PATCH PROPS node=" + this.path[this.path.length - 1] + " patchType=" + this.patchType + " prop=" + this.propName;
        }
    }

    return res;
};

Primitive.dataNodeChange = function(element, oldJson, norollback) {
    var res = {
        type: PrimitiveType.DataNodeChange,
        path: element.primitivePath(),
        node: element.toJSON()
    };

    if (!norollback) {
        res._rollbackData = {
            type: PrimitiveType.DataNodeChange,
            path: element.primitivePath(),
            node: oldJson
        };
    }

    if (DEBUG){
        res.toString = function(){
            return "CHANGE node=" + this.path[this.path.length - 1] + " json=" + JSON.stringify(this.node);
        }
    }

    return res;
};

Primitive.dataNodeChangePosition = function(parent, element, newPosition, oldPosition, norollback) {
    var res = {
        type: PrimitiveType.DataNodeChangePosition,
        path: parent.primitivePath(),
        childId: element.id(),
        newPosition
    };

    if (!norollback) {
        res._rollbackData = {
            type: PrimitiveType.DataNodeChangePosition,
            path: parent.primitivePath(),
            childId: element.id(),
            newPosition: oldPosition
        };
    }

    if (DEBUG){
        res.toString = function(){
            return "CHANGE POSITION node=" + this.path[this.path.length - 1] + " childId=" + this.childId + " newPosition=" + this.newPosition;
        }
    }

    return res;
};

Primitive.element_delete = function (primitiveRootId, parentId, element, data, norollback) {
    if (!element) {
        return;
    }

    var res = {
        id: {
            command: "element_delete",
            parentId: parentId,
            elementId: element.id(),
            primitiveRootId: primitiveRootId,
            pageId: App.Current.activePage.id()
        },
        data: {}
    };

    if (!norollback) {
        res._rollbackData = Primitive.element_new(primitiveRootId, parentId, element, undefined, data, true);
    }

    return res;
};

Primitive.element_new = function (primitiveRootId, parentId, element, index, data, norollback) {
    if (!App.Current.activePage.isDesignerPage()) {
        return;
    }

    var data = data || element.toJSON();
    var order = index !== undefined ? index : element.zOrder();

    var res = {
        id: {
            command: "element_new",
            elementId: element.id(),
            parentId: parentId,
            primitiveRootId: primitiveRootId,
            pageId: App.Current.activePage.id()
        },
        data: {
            data: data,
            order: order
        }
    };

    if (!norollback) {
        res._rollbackData = Primitive.element_delete(primitiveRootId, parentId, element, null, true);
    }

    return res;
};

Primitive.element_change = function (element, page) {
    if (!App.Current.activePage.isDesignerPage()) {
        return;
    }

    var parentId = element.parent().id();
    return {
        id: {command: "element_change", elementId: element.id(), parentId: parentId},
        data: {
            parentId: parentId,
            order: element.zOrder(),
            pageId: page ? page.id() : App.Current.activePage.id(),
            data: element.toJSON()
        }
    };
};

Primitive.element_state_override = function (element, stateName, stateProperties) {
    if (!App.Current.activePage.isDesignerPage()) {
        return;
    }

    return {
        id: {command: "element_state_override", elementId: element.id()},
        data: {
            pageId: App.Current.activePage.id(),
            stateName: stateName,
            properties: stateProperties
        }
    };
};

Primitive.element_state_new = function (primitiveRootId, elementId, stateId, state, noRollback) {
    var primitive = {
        id: {
            command: "element_state_new",
            primitiveRootId,
            elementId,
            stateId,
            pageId: App.Current.activePage.id()
        },
        data: {
            state
        }
    };

    if (!noRollback) {
        primitive._rollbackData = Primitive.element_state_remove(primitiveRootId, elementId, stateId, null, true);
    }
    
    return primitive;
};

Primitive.element_state_remove = function (primitiveRootId, elementId, stateId, oldState, noRollback) {
    var primitive = {
        id: {
            command: "element_state_remove",
            primitiveRootId,
            elementId,
            stateId,
            pageId: App.Current.activePage.id()
        },
        data: {}
    };

    if (!noRollback) {
        primitive._rollbackData = Primitive.element_state_new(primitiveRootId, elementId, stateId, oldState, true);
    }

    return primitive;
};

Primitive.element_state_change = function (primitiveRootId, elementId, stateId, newState, oldState, noRollback) {
    var primitive = {
        id: {
            command: "element_state_change",
            primitiveRootId,
            elementId,
            stateId,
            pageId: App.Current.activePage.id()
        },
        data: {
            state:newState
        }
    };

    if (!noRollback) {
        primitive._rollbackData = Primitive.element_state_change(primitiveRootId, elementId, stateId, oldState, null, true);
    }

    return primitive;
};

Primitive.no_op = function () {
    return {};
};

Primitive.element_props_change = function (primitiveRootId, elementId, props, oldProps) {
    if (!App.Current.activePage.isDesignerPage()) {
        return;
    }

    var primitive = {
        id: {
            command: "element_props_change",
            primitiveRootId: primitiveRootId,
            elementId: elementId,
            pageId: App.Current.activePage.id()
        },
        data: {
            props: props
        }
    };

    if (oldProps) {
        primitive._rollbackData = {
            id: primitive.id,
            data: {
                props: oldProps
            }
        };
    }

    return primitive;
};

Primitive.element_position_change = function (primitiveRootId, newParentId, elementId, index, oldIndex, oldParentId, oldRootId, norollback) {
    if (!App.Current.activePage.isDesignerPage()) {
        return;
    }

    var primitive = {
        id: {
            command: "element_position_change",
            primitiveRootId: primitiveRootId,
            parentId: newParentId,
            elementId: elementId,
            pageId: App.Current.activePage.id()
        },
        data: {
            index: index,
            oldParentId: oldParentId,
            oldRootId: oldRootId
        }
    };

    if (!norollback) {
        primitive._rollbackData = Primitive.element_position_change(
            oldRootId || primitiveRootId,
            oldParentId || newParentId,
            elementId, oldIndex, index,
            oldRootId ? newParentId : undefined,
            oldRootId ? primitiveRootId : undefined, true);
    }

    return primitive;
};

Primitive.template_delete = function (templateId) {
    return {
        id: {command: "template_delete", templateId: templateId},
        data: {}
    }
};

Primitive.template_change = function (template) {
    return {
        id: {command: "template_change", templateId: template.templateId()},
        data: {template: template.toJSON()}
    }
};

Primitive.element_table_cells_remove = function (element, orientation, index) {
    return {
        id: {command: "element_table_cells_remove", elementId: element.id()},
        data: {
            orientation: orientation,
            index: index,
            pageId: App.Current.activePage.id()
        }
    }
};

Primitive.page_props_changed = function (page, props, oldProps) {
    if (!page.isDesignerPage()) {
        return;
    }
    // if (value && typeof value.toJSON === 'function') {
    //     value = value.toJSON(false);
    // }
    var primitive = {
        id: {
            command: 'page_props_change',
            pageId: page.id()
        },
        data: {
            props: props
        }
    };

    if (oldProps) {
        primitive._rollbackData = {
            id: primitive.id,
            data: {
                props: oldProps,
                pageId: primitive.data.pageId
            }
        };
    }

    return primitive;
};

Primitive.page_added = function (page) {
    if (!page.isDesignerPage()) {
        return;
    }
    var group = App.Current.getPageGroupById(page.groupId());

    return {
        id: {
            command: "page_add",
            pageId: page.id()
        },
        data: {
            page: page.toJSON(),
            index: group.indexOfPageId(page.id())
        }
    };
};

Primitive.page_removed = function (page) {
    if (!page.isDesignerPage()) {
        return;
    }
    return {
        id: {
            command: "page_remove",
            pageId: page.id()
        },
        data: {}
    };
};

Primitive.pagegroup_added = function (group) {
    return {
        id: {
            command: "pagegroup_add",
            groupId: group.id(),
            time: new Date().getTime() //making id unique while page groups have integer ids
        },
        data: {
            name: group.name()
        }
    };
};

Primitive.pagegroup_removed = function (group) {
    return {
        id: {
            command: "pagegroup_remove",
            groupId: group.id(),
            time: new Date().getTime() //making id unique while page groups have integer ids
        }
    };
};

Primitive.pagegroup_reorder = function (instructions) {
    return {
        id: {
            command: "pagegroup_reorder"
        },
        data: {
            instructions: instructions
        }
    };
};

Primitive.pagegroup_prop_changed = function (group, name, value) {
    if (value && typeof value.toJSON === 'function') {
        value = value.toJSON(false);
    }

    if (name === 'pageIds') {
        return;
    }

    return {
        id: {
            command: 'pagegroup_prop_changed',
            groupId: group.id(),
            name: name,
            time: new Date().getTime() //making id unique while page groups have integer ids
        },
        data: {
            value: value
        }
    };
};

Primitive.pagegroup_page_move = function (page, oldGroupId, newIndex) {
    return {
        id: {
            command: 'pagegroup_page_move',
            pageId: page.id
        },
        data: {
            fromGroupId: oldGroupId,
            toGroupId: page.group.id,
            newIndex: newIndex
        }
    }
}

Primitive.app_props_changed = function (app, props, oldProps) {
    var primitive = {
        id: {
            command: 'app_props_change'
        },
        data: {
            props: props
        }
    };

    if (oldProps) {
        primitive._rollbackData = {
            id: primitive.id,
            data: {
                props: oldProps
            }
        };
    }

    return primitive;
};

Primitive.share_setStartupPage = function (value) {
    return {
        id: {
            command: 'share_setStartupPage'
        },
        data: {
            value: value
        }
    };
};

Primitive.element_patch = function (element, data) {
    if (!App.Current.activePage.isDesignerPage()) {
        return;
    }

    return {
        id: {
            command: 'element_patch',
            pageId: App.Current.activePage.id(),
            elementId: element.id()
        },
        data: data
    };
};

function getPageName(pageId) {
    var page = DataNode.getImmediateChildById(App.Current, pageId);
    return page ? page.props.name : "";
}

Primitive.comment_add = function (text, id, parentId, pageId, time, x, y, number) {
    return {
        id: {
            command: 'comment_add',
            uid: id
        },
        data: {
            text: text,
            parentUid: parentId,
            pageId: pageId,
            time: time,
            x: x,
            y: y,
            number: number,
            pageName: getPageName(pageId),
            host: location.origin
        }
    };
};

Primitive.comment_remove = function (id, pageId) {
    return {
        id: {
            command: 'comment_remove',
            uid: id
        },
        data: {
            pageName: getPageName(pageId),
            pageId: pageId,
            host: location.origin
        }
    }
};

Primitive.comment_update = function (id, text, pageId) {
    return {
        id: {
            command: 'comment_update',
            uid: id
        },
        data: {
            text: text,
            pageName: getPageName(pageId),
            pageId: pageId,
            host: location.origin
        }
    }
};

Primitive.comment_change_status = function (id, status, pageId) {
    return {
        id: {
            command: 'comment_change_status',
            uid: id
        },
        data: {
            status: status,
            pageName: getPageName(pageId),
            pageId: pageId,
            host: location.origin
        }
    }
}

Primitive.comment_move_note = function (id, x, y) {
    return {
        id: {
            command: 'comment_move_note',
            uid: id
        },
        data: {
            pageX: x,
            pageY: y
        }
    }
}

Primitive.page_status_change = function (pageId, statusId, statusMessage) {
    return {
        id: {
            command: 'page_status_change',
            pageId: pageId
        },
        data: {
            statusId: statusId,
            pageId: pageId,
            statusMessage: statusMessage
        }
    }
}

Primitive.app_online = function () {
    return {
        id: {
            command: 'app_online'
        }
    }
}

Primitive.app_offline = function () {
    return {
        id: {
            command: 'app_offline'
        }
    }
}

Primitive.path_insert_point = function (elementId, point, position) {
    return {
        id: {
            command: 'path_insert_point',
            pageId: App.Current.activePage.id(),
            elementId: elementId
        },
        data: {
            position: position,
            point: point
        }
    }
}

Primitive.path_change_point = function (elementId, point, position) {
    return {
        id: {
            command: 'path_change_point',
            pageId: App.Current.activePage.id(),
            elementId: elementId
        },
        data: {
            position: position,
            point: point
        }
    }
}


export default Primitive;