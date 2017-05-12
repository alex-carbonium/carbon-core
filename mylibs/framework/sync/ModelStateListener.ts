import Primitive from "./Primitive";
import { PatchType } from "carbon-core";

var lastSelection = {};

class ModelStateListener {
    elementsPropsCache: {};
    roots: any[];
    rootsWithAffectedLayout: any[];

    private _stopCounter: number;

    constructor(){
        this.clear();
        this._stopCounter = 0;
        this.rootsWithAffectedLayout = [];
        this.roots = [];
    }

    clear(){
        this.roots = [];
        this.elementsPropsCache = {};
    }

    stop(){
        ++this._stopCounter;
    }

    start(){
        if (this._stopCounter > 0){
            --this._stopCounter;
        }
    }

    _getOrCreateRootData(key){
        var root = this.roots.find(x => x.key === key);
        if (!root){
            root = {key, data: []};
            this.roots.push(root);
        }
        return root.data;
    }

    trackSetProps(primitiveRoot, element, props, oldProps){
        if (this._stopCounter > 0){
            return;
        }
        var root = this._getOrCreateRootData(primitiveRoot.primitiveRootKey());

        var primitive = Primitive.dataNodeSetProps(element, props, oldProps);
        root.push(primitive);

        var elementId = element.id();
        var oldPrimitive = this.elementsPropsCache[elementId];
        if (!oldPrimitive){
            oldPrimitive = primitive._rollbackData;
            this.elementsPropsCache[elementId] = oldPrimitive;
        }
        else{
            var initialOldProps = oldPrimitive.props;

            // we need to keep original property in this frame, in case setProps called many times for the same property
            for (var p in oldProps){
                if (initialOldProps[p] === undefined){
                    initialOldProps[p] = oldProps[p];
                }
            }
        }

        if (element.isChangeAffectingLayout(props)){
            this._markForRelayout(primitiveRoot);
        }
    }

    trackDelete(primitiveRoot, parent, element, index){
        if (this._stopCounter > 0){
            return;
        }
        var root = this._getOrCreateRootData(primitiveRoot.primitiveRootKey());

        root.push(Primitive.dataNodeRemove(parent, element, index));

        this._markForRelayout(primitiveRoot);
    }

    trackInsert(primitiveRoot, parent, element, index){
        if (this._stopCounter > 0){
            return;
        }
        var root = this._getOrCreateRootData(primitiveRoot.primitiveRootKey());

        root.push(Primitive.dataNodeAdd(parent, element, index));

        this._markForRelayout(primitiveRoot);
    }

    trackSelect(page, selection, oldSelection, userId){
        if (this._stopCounter > 0){
            return;
        }
        var root = this._getOrCreateRootData(page.primitiveRootKey());

        root.push(Primitive.selection(page, selection, oldSelection, userId));
    }

    createViewPrimitive(page, sx, sy, scale, oldsx, oldsy, oldscale){
        if (this._stopCounter > 0){
            return;
        }

        return Primitive.view(page, sx, sy, scale, oldsx, oldsy, oldscale);
    }

    trackChangePosition(primitiveRoot, parent, element, index, oldIndex){
        if (this._stopCounter > 0){
            return;
        }
        var root = this._getOrCreateRootData(primitiveRoot.primitiveRootKey());

        root.push(Primitive.dataNodeChangePosition(parent, element, index, oldIndex));
    }

    trackPatchProps(primitiveRoot, element, patchType, propName, item){
        if (this._stopCounter > 0){
            return;
        }
        var primitive = Primitive.dataNodePatchProps(element, patchType, propName);
        var rollback = Primitive.dataNodePatchProps(element, 0, propName);
        primitive._rollbackData = rollback;

        switch (patchType){
            case PatchType.Insert:
                primitive.item = item;

                rollback.patchType = PatchType.Remove;
                rollback.item = item;
                break;
            case PatchType.Remove:
                primitive.item = item;

                rollback.patchType = PatchType.Insert;
                rollback.item = item;
                break;
            case PatchType.Change:
                primitive.item = item;

                let array = element.props[propName];
                var oldItem = array.find(x => x.id === item.id);
                rollback.patchType = PatchType.Change;
                rollback.item = oldItem;
                break;
            default:
                throw new Error("Unknown patch type " + patchType);
        }

        var root = this._getOrCreateRootData(primitiveRoot.primitiveRootKey());
        root.push(primitive);
    }

    //mark root for relayout
    touchRoot(key){
        this._getOrCreateRootData(key);
    }

    _markForRelayout(root){
        if (this.rootsWithAffectedLayout.indexOf(root) === -1){
            this.rootsWithAffectedLayout.push(root);
        }
    }

    isRelayoutNeeded(root): boolean{
        return this.rootsWithAffectedLayout.indexOf(root) !== -1;
    }

    markRelayoutCompleted(){
        this.rootsWithAffectedLayout.length = 0;
    }
}

export default new ModelStateListener();
