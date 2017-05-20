import DataNode from "../framework/DataNode";
import PropertyMetadata from "../framework/PropertyMetadata";
import RelayoutEngine from "framework/relayout/RelayoutEngine";
import {Types} from "../framework/Defs";
import params from "params";

class Story extends DataNode {
    _parent:any;

    constructor() {
        super(true);
        this.initId();
    }

    resetRuntimeProps() {
        this.runtimeProps = {};
    }

    add(action) {
        this.insertChild(action, this.children.length);
    }

    displayName() {
        return '';
    }

    relayout(oldPropsMap){
        params.perf && performance.mark("Artboard.Relayout: " + this.id());
        var res = RelayoutEngine.run(this, oldPropsMap);
        params.perf && performance.measure("Artboard.Relayout: " + this.id(), "Artboard.Relayout: " + this.id());
        return res;
    }

    relayoutCompleted(){
    }

    removeFirst(predicate) {
        var index = this.children.findIndex(predicate);
        if(index >= 0){
            this.removeChildByIndex(index);
        }
    }

    primitiveRoot() {
        return this;
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

    insert(/*UIElement*/element, /*int*/index, mode?) {
        this.insertChild(element, index, mode);

        return element;
    }

    performArrange() {

    }
}
Story.prototype.t = Types.Story;

PropertyMetadata.registerForType(Story, {
    homeScreen:{
        defaultValue:null
    }
});

export default Story;