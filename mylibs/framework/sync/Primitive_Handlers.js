import ObjectFactory from "../ObjectFactory";
import Primitive from "./Primitive";
import UIElement from "framework/UIElement";
import {PrimitiveType, ChangeMode} from "../Defs";
import Invalidate from "framework/Invalidate";
import Selection from "framework/SelectionModel";
import Environment from "environment";
import AnimationGroup from "framework/animation/AnimationGroup";

var debug = require("DebugUtil")("carb:primitivesSync");

var handlers = {};

Primitive.registerHandler = function (name, handler) {
    handlers[name] = handler;
};

Primitive.changeProjectFromPrimitives = function (app, primitives) {
    for (var i = 0; i < primitives.length; ++i) {
        var p = primitives[i];
        
    }
    Invalidate.request();
};

Primitive.mapChangedPageIds = function (primitives) {
    var res = {};

    for (var i = 0; i < primitives.length; ++i) {
        var p = primitives[i];
        var id = p.id.pageId || (p.data && p.data.pageId);
        if (id) {
            res[id] = (res[id] || 0) + 1;
        }
    }

    return res;
};

Primitive.registerHandler(PrimitiveType.DataNodeAdd, function(container, p){
    var element = UIElement.fromJSON(p.node);
    container.insert(element, p.index, ChangeMode.Self);
    return element;
});

Primitive.registerHandler(PrimitiveType.DataNodeRemove, function(container, p){
    var element = container.getImmediateChildById(p.childId);
    if (element){
        if(Selection.isElementSelected(element)){
            Selection.unselectGroup([element], true);
        }
        container.remove(element, ChangeMode.Self);
    }
});

Primitive.registerHandler(PrimitiveType.DataNodeSetProps, function(element, p){
    ObjectFactory.updatePropsWithPrototype(p.props);
    element.setProps(p.props, ChangeMode.Self);
});

Primitive.registerHandler(PrimitiveType.DataNodeChange, function(element, p){
    element.fromJSON(p.node);
});

Primitive.registerHandler(PrimitiveType.Selection, function(page, p){
    var selection = p.selection;
    var selectionMap = selection.reduce((map, value)=>{
        map[value] = true;
        return map;
    }, {})
    if(!selection.length) {
        Selection.makeSelection([], false, true);
    } else {
        var elements = [];
        page.applyVisitor(e=>{
            if(selectionMap[e.id()]) {
                elements.push(e);
                if(elements.length === selection.length) {
                    return false;
                }
            }
        })

        Selection.makeSelection(elements, false, true);
    }
});

Primitive.registerHandler(PrimitiveType.View, function(page, p) {
    var animationValues = [];
    var options = {duration:180};

    animationValues.push({ from: page.scrollX(), to: p.x, accessor: function(value) {
        if(arguments.length === 1) {
            return page.scrollX(value);
        }

        return page.scrollX();
    } });

    animationValues.push({ from: page.scrollY(), to: p.y, accessor: function(value) {
        if(arguments.length === 1) {
            return page.scrollY(value);
        }

        return page.scrollY();
    } });

    animationValues.push({ from: Environment.view.scale(), to: p.s, accessor: function(value) {
        if(arguments.length === 1) {
            return Environment.view.scale(value);
        }

        return Environment.view.scale();
    } });
    
    var group = new AnimationGroup(animationValues, options, ()=>{
        Invalidate.request();
    });

    Environment.view.animationController.registerAnimationGroup(group);        
});


Primitive.registerHandler(PrimitiveType.DataNodeChangePosition, function(container, p){
    var element = container.getImmediateChildById(p.childId);
    if (element){
        container.changePosition(element, p.newPosition, ChangeMode.Self);
    }
});

Primitive.registerHandler(PrimitiveType.DataNodePatchProps, function(element, p){
    element.patchProps(p.patchType, p.propName, p.item, ChangeMode.Self);
});

Primitive.handle = function(element, primitive){
    var h = handlers[primitive.type];
    if (h){
        return h(element, primitive);
    }
    return null;
};

export default Primitive;
