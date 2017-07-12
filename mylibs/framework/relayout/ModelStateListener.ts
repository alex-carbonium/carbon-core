import Primitive from "../sync/Primitive";
import { PatchType, IDataNode, IPrimitive } from "carbon-core";

let lastSelection = {};

class ModelStateListener {
    elementsPropsCache: {};
    roots: string[];
    rootsWithAffectedLayout: IDataNode[];
    primitives: IPrimitive[];

    private _stopCounter: number;

    constructor(){
        this._stopCounter = 0;
        this.rootsWithAffectedLayout = [];
        this.roots = [];
        this.primitives = [];
        this.elementsPropsCache = {};
    }

    clear(){
        this.roots.length = 0;
        this.rootsWithAffectedLayout.length = 0;
        this.primitives.length = 0;
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

    trackSetProps(primitiveRoot, element, props, oldProps){
        if (this._stopCounter > 0){
            return;
        }
        this.touchRoot(primitiveRoot.primitiveRootKey());

        let primitive = Primitive.dataNodeSetProps(element, props, oldProps);
        this.primitives.push(primitive);

        let elementId = element.id();
        let oldPrimitive = this.elementsPropsCache[elementId];
        if (!oldPrimitive){
            oldPrimitive = primitive._rollbackData;
            this.elementsPropsCache[elementId] = oldPrimitive;
        }
        else{
            let initialOldProps = oldPrimitive.props;

            // we need to keep original property in this frame, in case setProps called many times for the same property
            for (let p in oldProps){
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
        this.touchRoot(primitiveRoot.primitiveRootKey());

        this.primitives.push(Primitive.dataNodeRemove(parent, element, index));

        this._markForRelayout(primitiveRoot);
    }

    trackInsert(primitiveRoot, parent, element, index){
        if (this._stopCounter > 0){
            return;
        }
        this.touchRoot(primitiveRoot.primitiveRootKey());

        this.primitives.push(Primitive.dataNodeAdd(parent, element, index));

        this._markForRelayout(primitiveRoot);
    }

    trackSelect(page, selection, oldSelection, userId){
        if (this._stopCounter > 0){
            return;
        }
        var p = Primitive.selection(page, selection, oldSelection, userId);
        this.touchRoot(page.primitiveRootKey());

        this.primitives.push(p);
    }

    createViewPrimitive(page, newState, oldState){
        if (this._stopCounter > 0){
            return;
        }

        return Primitive.view(page, newState, oldState);
    }

    trackChangePosition(primitiveRoot, parent, element, index, oldIndex){
        if (this._stopCounter > 0){
            return;
        }
        this.touchRoot(primitiveRoot.primitiveRootKey());

        this.primitives.push(Primitive.dataNodeChangePosition(parent, element, index, oldIndex));
    }

    trackPatchProps(primitiveRoot, element, patchType, propName, item){
        if (this._stopCounter > 0){
            return;
        }
        let primitive = Primitive.dataNodePatchProps(element, patchType, propName);
        let rollback = Primitive.dataNodePatchProps(element, 0, propName);
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
                let oldItem = array.find(x => x.id === item.id);
                rollback.patchType = PatchType.Change;
                rollback.item = oldItem;
                break;
            default:
                throw new Error("Unknown patch type " + patchType);
        }

        this.touchRoot(primitiveRoot.primitiveRootKey());
        this.primitives.push(primitive);
    }

    //mark root for relayout
    touchRoot(key){
        let idx = this.roots.indexOf(key);
        if (idx === -1) {
            this.roots.push(key);
        }
    }

    _markForRelayout(root){
        if (this.rootsWithAffectedLayout.indexOf(root) === -1){
            this.rootsWithAffectedLayout.push(root);
        }
    }

    isRelayoutNeeded(root): boolean{
        return this.rootsWithAffectedLayout.indexOf(root) !== -1;
    }
}

export default new ModelStateListener();
