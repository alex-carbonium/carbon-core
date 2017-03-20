import PropertyMetadata from "./PropertyMetadata";
import PropertyTracker from "./PropertyTracker";
import ModelStateListener from "./sync/ModelStateListener";
import {PatchType, ChangeMode} from "./Defs";
import ObjectFactory from "./ObjectFactory";
import {createUUID} from "../util";
import {IDataNodeProps} from './CoreModel';

export default class DataNode{
    t: string;
    props: IDataNodeProps;
    children: DataNode[];

    constructor(hasChildren: boolean) {
        this.props = PropertyMetadata.getDefaultProps(this.t);
        this.resetRuntimeProps();
        if (hasChildren) {
            this.children = [];
        }
    }

    prepareProps(changes: IDataNodeProps){
        for (let p in changes){
            let oldValue = this.props[p];
            let newValue = changes[p];
            if (newValue === oldValue){
                delete changes[p];
            }
        }
    }

    setProps(props, mode = ChangeMode.Model) {
        var oldProps = {};
        var propsChanged = false;
        for (var p in props) {
            var oldValue = this.props[p];
            var newValue = props[p];
            if (newValue !== oldValue) {
                propsChanged = true;
                oldProps[p] = oldValue;
            }
        }

        if (propsChanged) {
            if (mode !== ChangeMode.Self){
                this.trackSetProps(props, oldProps, mode);
            }

            Object.assign(this.props, props);
            this.propsUpdated(props, oldProps, mode);
        }
    }

    prepareAndSetProps(props, mode) {
        this.prepareProps(props);
        this.setProps(props, mode);
    }

    propsUpdated(newProps, oldProps) {
        if (this.runtimeProps && this.runtimeProps.trackPropsCounter) {
            PropertyTracker.changeProps(this, newProps, oldProps);
        }
    }

    patchProps(patchType, propName, item, mode = ChangeMode.Model) {
        //first track to capture old item for PatchType.Change
        if (mode !== ChangeMode.Self) {
            this.trackPatchProps(patchType, propName, item, mode);
        }
        let array;
        var current = this.props[propName];
        if(current instanceof Array){
            array = current.slice();
        } else {
            array = [];
        }
        this.props[propName] = array;

        switch (patchType) {
            case PatchType.Insert:
                array.push(item);
                break;
            case PatchType.Remove:
                for (let i = 0; i < array.length; i++) {
                    if (array[i].id === item.id) {
                        array.splice(i, 1);
                        break;
                    }
                }
                break;
            case PatchType.Change:
                for (let i = 0; i < array.length; i++) {
                    if (array[i].id === item.id) {
                        array[i] = item;
                        break;
                    }
                }
                break;
            default:
                throw new Error("Unknown patch type " + patchType);
        }

        this.propsPatched(patchType, propName, item);
    }

    propsPatched(patchType, propName, item) {
        if (this.runtimeProps && this.runtimeProps.trackPropsCounter) {
            PropertyTracker.changeProps(this, this.selectProps([propName]), {});
        }
    }

    cloneProps() {
        return Object.assign({}, this.props);
    }

    isAtomicInModel() {
        return false;
    }

    selectProps(namesOrChanges) {
        var result = {};
        if (Array.isArray(namesOrChanges)) {
            for (var i = 0; i < namesOrChanges.length; i++) {
                var p = namesOrChanges[i];
                result[p] = this.props[p];
            }
        }
        else {
            for (var i in namesOrChanges) {
                result[i] = this.props[i];
            }
        }
        return result;
    }


    insertChild(child, index, mode = ChangeMode.Model) {
        this.children.splice(Math.min(index, this.children.length), 0, child);

        if (mode !== ChangeMode.Self) {
            child.trackInserted(this, index, mode);
        }
        return child;
    }

    removeChild(child, mode = ChangeMode.Model) {
        var idx = this.children.indexOf(child);
        if (idx !== -1) {
            this.removeChildByIndex(idx, mode);
        }
        return idx;
    }

    removeChildByIndex(index, mode = ChangeMode.Model) {
        var child = this.children.splice(index, 1)[0];
        if (mode !== ChangeMode.Self) {
            child.trackDeleted(this, index, mode);
        }

    }

    changeChildPosition(child, index, mode = ChangeMode.Model) {
        var oldIndex;
        var items = this.children;
        for (var i = items.length - 1; i >= 0; i--) {
            if (items[i] === child) {
                oldIndex = i;
                if (i === index) {
                    return;
                }
                items.splice(i, 1);
                break;
            }
        }

        items.splice(index, 0, child);

        if (mode !== ChangeMode.Self) {
            child.trackChangePosition(this, index, oldIndex, mode);
        }
    }


    resetRuntimeProps() {
    }


    id(value) {
        if (value !== undefined) {
            this.setProps({id: value}, ChangeMode.Self);
        }
        return this.props.id;
    }

    initId(){
        this.id(createUUID());
    }

    primitiveRoot() {
        return null;
    }

    primitivePath() {
        return [];
    }

    primitiveRootKey() {
        return '';
    }


    enablePropsTracking() {
        if (this.runtimeProps.trackPropsCounter === undefined) {
            this.runtimeProps.trackPropsCounter = 0;
        }
        ++this.runtimeProps.trackPropsCounter;
    }

    disablePropsTracking() {
        if (this.runtimeProps.trackPropsCounter && --this.runtimeProps.trackPropsCounter === 0) {
            delete this.runtimeProps.trackPropsCounter;
        }
    }


    trackSetProps(props, oldProps, mode = ChangeMode.Model) {
        var primitiveRoot = this.primitiveRoot();
        if (primitiveRoot) {
            primitiveRoot.registerSetProps(this, props, oldProps, mode);
        }
    }

    trackPatchProps(patchType, propName, item, mode = ChangeMode.Model) {
        let root = this.primitiveRoot();
        if (root) {
            root.registerPatchProps(this, patchType, propName, item, mode);
        }
    }
    trackDeleted(parent, index, mode = ChangeMode.Model) {
        var primitiveRoot = parent.primitiveRoot();
        if (primitiveRoot) {
            primitiveRoot.registerDelete(parent, this, index, mode);
        }
    }

    trackInserted(parent, index, mode = ChangeMode.Model) {
        var primitiveRoot = parent.primitiveRoot();
        if (primitiveRoot) {
            primitiveRoot.registerInsert(parent, this, index, mode);
        }
    }

    trackChangePosition(parent, index, oldIndex, mode = ChangeMode.Model) {
        var primitiveRoot = parent.primitiveRoot();
        if (primitiveRoot) {
            primitiveRoot.registerChangePosition(parent, this, index, oldIndex, mode);
        }
    }

    registerSetProps(element, props, oldProps, mode = ChangeMode.Model) {
        if (mode === ChangeMode.Model) {
            ModelStateListener.trackSetProps(this, element, props, oldProps);
        }
    }

    registerPatchProps(element, patchType, propName, item, mode = ChangeMode.Model) {
        if (mode === ChangeMode.Model) {
            ModelStateListener.trackPatchProps(this, element, patchType, propName, item);
        }
    }

    registerDelete(parent, element, index, mode = ChangeMode.Model) {
        if (mode === ChangeMode.Model) {
            ModelStateListener.trackDelete(this, parent, element, index);
        }
        if (this.runtimeProps && this.runtimeProps.trackPropsCounter) {
            PropertyTracker.registerDelete(parent, element);
        }
    }


    registerInsert(parent, element, index, mode = ChangeMode.Model) {
        if (mode === ChangeMode.Model) {
            ModelStateListener.trackInsert(this, parent, element, index);
        }
        if (this.runtimeProps && this.runtimeProps.trackPropsCounter) {
            PropertyTracker.registerInsert(parent, element);
        }
    }


    registerChangePosition(parent, element, index, oldIndex, mode = ChangeMode.Model) {
        if (mode === ChangeMode.Model) {
            ModelStateListener.trackChangePosition(this, parent, element, index, oldIndex);
        }
    }

    getImmediateChildById(id:string, materialize:boolean) {
        return DataNode.getImmediateChildById(this, id, materialize);
    }

    static getImmediateChildById(container: any, id:string, materialize:boolean = false) {
        if(!container.children) {
            return null;
        }

        let i = 0;
        let child = null;
        for(; i < container.children.length; ++i){
            child = container.children[i];
            if(child.props.id === id) {
                break;
            }
            child = null;
        }

        if(child && materialize){
            var materializedItem = ObjectFactory.getObject(child);
            if(child !== materializedItem){
                child = container.children[i] = materializedItem;
            }
        }

        return child;
    }

    applyVisitorDepthFirst(callback) {
        if (this.children) {
            for (var i = 0; i < this.children.length; i++) {
                var child = this.children[i];
                if (child.applyVisitorDepthFirst(callback) === false) {
                    return false;
                }
            }
        }
        return callback(this) !== false;
    }

    applyVisitorBreadthFirst(visitor) {
        var queue = [this];
        var i = -1;
        while (++i !== queue.length) {
            var element = queue[i];
            if (visitor(element) === false) {
                break;
            }
            if (element.children) {
                if (queue.length > 100) {
                    queue.splice(0, i + 1);
                    i = -1;
                }
                Array.prototype.push.apply(queue, element.children);
            }
        }
    }

    findNodeBreadthFirst(func) {
        var node = null;
        this.applyVisitorBreadthFirst(x => {
            if (func(x)) {
                node = x;
                return false;
            }
            return true;
        });
        return node;
    }

    findNodeByIdBreadthFirst(id) {
        return this.findNodeBreadthFirst(x => x.id() === id);
    }
    findAllNodesDepthFirst(func) {
        var nodes = [];
        this.applyVisitorDepthFirst(x => {
            if (func(x)) {
                nodes.push(x);
            }
        });
        return nodes;
    }

    toJSON(){
        var json = {t: this.t, props: this.cloneProps()};
        if (!this.isAtomicInModel() && this.children){
            json.children = this.children.map(x => x.toJSON());
        }
        return json;
    }


    acquiringChild(child) {
    }

    acquiredChild(child, mode){
    }

    fromJSON(data) {
        // TODO: consider to do server migration
        ObjectFactory.updatePropsWithPrototype(data.props);

        this.setProps(data.props, ChangeMode.Self);

        if (data.children) {
            this.children = [];
            for(var i = 0; i < data.children.length; ++i) {
                var child = ObjectFactory.getObject(data.children[i]);
                this.children.push(child);
                this.acquiredChild(child, ChangeMode.Self);
            }
        }
        return this;
    }

    isChangeAffectingLayout(changes): boolean {
        return false;
    }
}