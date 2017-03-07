import DataNode from "../framework/DataNode";
import PropertyMetadata from "../framework/PropertyMetadata";
import {Types} from "../framework/Defs";

class Story extends DataNode {
    constructor() {
        super(true);
    }

    primitiveRoot() {
        return this;
    }

    resetRuntimeProps() {
        this.runtimeProps = {};
    }

    add(action) {
        this.insertChild(action, this.children.length);
    }

    relayout(){
    }

    relayoutCompleted(){
    }

    arrangeRootDepthFirst() {
    }

    removeFirst(predicate) {
        var index = this.children.findIndex(predicate);
        if(index >= 0){
            this.removeChildByIndex(index);
        }
    }

    primitivePath() {
        var path = this.runtimeProps.primitivePath;
        if (!path) {
            path = [this.id(), this.id()];
            this.runtimeProps.primitivePath = path;
        }
        return path;
    }

    primitiveRootKey() {
        return this.id();
    }
}
Story.prototype.t = Types.Story;

PropertyMetadata.registerForType(Story, {
    homeScreen:{
        defaultValue:null
    }
});

export default Story;