import { PrimitiveType } from "./framework/Defs";
import debug from "debug";

function nodeName(primitive){
    if (primitive.props && primitive.props.name){
        return primitive.props.name;
    }
    if (primitive.node && primitive.node.props.name){
        return primitive.node.props.name;
    }
    return primitive.path[primitive.path.length - 1];
}
debug.formatters["p"] = function (p) {
    switch (p.type) {
        case PrimitiveType.DataNodeSetProps:
            return "SET PROPS node=" + nodeName(p) + " props=" + JSON.stringify(p.props);
        case PrimitiveType.DataNodeAdd:
            return "ADD parent=" + p.path[p.path.length - 1] + " child=" + p.node.t + " (" + p.node.props.id + ")";
        case PrimitiveType.DataNodeRemove:
            return "REMOVE parent=" + p.path[p.path.length - 1] + " child=" + p.childId;
        case PrimitiveType.Selection:
            return "SELECTION page=" + nodeName(p) + " ids=" + JSON.stringify(p.selection);
        case PrimitiveType.View:
            return "VIEW page=" + nodeName(p) + " sx=" + p.s + " sy="+ p.s + " scale="+p.s;
        case PrimitiveType.DataNodePatchProps:
            return "PATCH PROPS node=" + nodeName(p) + " patchType=" + p.patchType + " prop=" + p.propName;
        case PrimitiveType.DataNodeChange:
            return "CHANGE node=" + nodeName(p) + " json=" + JSON.stringify(p.node);
        case PrimitiveType.DataNodeChangePosition:
            return "CHANGE POSITION node=" + nodeName(p) + " childId=" + p.childId + " newPosition=" + p.newPosition;
    }
};

export default function (name) {
    console.log("can use debug.enable('%s')", name);
    return debug(name);
}