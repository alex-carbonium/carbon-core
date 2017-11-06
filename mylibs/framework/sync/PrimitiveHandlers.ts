import ObjectFactory from "../ObjectFactory";
import UIElement from "framework/UIElement";
import Invalidate from "framework/Invalidate";
import Selection from "framework/SelectionModel";
import Environment from "environment";
import AnimationGroup from "framework/animation/AnimationGroup";
import backend from "backend";
import { PrimitiveType, IPrimitive, IDataNode, ChangeMode, Primitive } from "carbon-core";
import ArrayPool from "../ArrayPool";

var debug = require("DebugUtil")("carb:primitiveHandlers");

type Handler = (element: IDataNode, primitive: IPrimitive) => IDataNode | null;

class PrimitiveHandlers {
    private handlers: { [key: string]: Handler } = {};

    registerHandler(name, handler) {
        this.handlers[name] = handler;
    }

    changeProjectFromPrimitives(app, primitives) {
        for (var i = 0; i < primitives.length; ++i) {
            var p = primitives[i];

        }
        Invalidate.request();
    }

    mapChangedPageIds(primitives) {
        var res = {};

        for (var i = 0; i < primitives.length; ++i) {
            var p = primitives[i];
            var id = p.id.pageId || (p.data && p.data.pageId);
            if (id) {
                res[id] = (res[id] || 0) + 1;
            }
        }

        return res;
    }

    handle(element: IDataNode, primitive: Primitive) {
        var h = this.handlers[primitive.type];
        if (h) {
            debug('Applying %p %o', primitive, primitive);
            return h(element, primitive);
        }
        return null;
    }
}

var handlers = new PrimitiveHandlers();

handlers.registerHandler(PrimitiveType.DataNodeAdd, function (container, p) {
    var element = null;
    if (!container.getImmediateChildById(p.node.props.id)) {
        element = UIElement.fromJSON(p.node);
        container.insert(element, p.index, ChangeMode.Self);
    }
    return element;
});

handlers.registerHandler(PrimitiveType.DataNodeRemove, function (container, p) {
    var element = container.getImmediateChildById(p.childId);
    if (element) {
        if (Selection.isElementSelected(element)) {
            Selection.makeSelection([element], "remove");
        }
        container.remove(element, ChangeMode.Self);
    }
});

handlers.registerHandler(PrimitiveType.DataNodeSetProps, function (element, p) {
    ObjectFactory.updatePropsWithPrototype(p.props);
    element.setProps(p.props, ChangeMode.Self);
});

handlers.registerHandler(PrimitiveType.DataNodeChange, function (element, p) {
    element.fromJSON(p.node);
});

handlers.registerHandler(PrimitiveType.Selection, function (page, p) {
    if (p.sessionId !== backend.sessionId) {
        return;
    }

    if (!page.app.isLoaded) {
        return;
    }

    var selection = p.selection;
    var selectionMap = selection.reduce((map, value) => {
        map[value] = true;
        return map;
    }, {})
    if (!selection.length) {
        Selection.makeSelection(ArrayPool.EmptyArray, "new", false, true);
    } else {
        var elements = [];
        page.applyVisitor(e => {
            if (selectionMap[e.id()]) {
                elements.push(e);
                if (elements.length === selection.length) {
                    return false;
                }
            }
        })

        Selection.makeSelection(elements, "new", false, true);
    }
});

handlers.registerHandler(PrimitiveType.View, function (page, p) {
    if (p.sessionId !== backend.sessionId) {
        return;
    }

    if (!page.app.isLoaded) {
        return;
    }

    Environment.view.changeViewState(p.newState);
});


handlers.registerHandler(PrimitiveType.DataNodeChangePosition, function (container, p) {
    var element = container.getImmediateChildById(p.childId);
    if (element) {
        container.changePosition(element, p.newPosition, ChangeMode.Self);
    }
});

handlers.registerHandler(PrimitiveType.DataNodePatchProps, function (element, p) {
    element.patchProps(p.patchType, p.propName, p.item, ChangeMode.Self);
});

export default handlers;
