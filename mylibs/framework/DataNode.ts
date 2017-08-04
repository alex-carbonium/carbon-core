import PropertyMetadata from "./PropertyMetadata";
import PropertyTracker from "./PropertyTracker";
import ModelStateListener from "./relayout/ModelStateListener";
import ObjectFactory from "./ObjectFactory";
import { createUUID } from "../util";
import { IDataNode, IDataNodeProps, ChangeMode, PatchType, IPrimitiveRoot, IConstructor } from "carbon-core";

//TODO: only real roots should implement IPrimitiveRoot
export default class DataNode<TProps extends IDataNodeProps = IDataNodeProps> implements IDataNode, IPrimitiveRoot {
    t: string;
    props: TProps;
    runtimeProps: any;
    children: DataNode[];
    protected _parent: IDataNode;

    constructor(hasChildren: boolean) {
        this.props = PropertyMetadata.getDefaultProps(this.t);
        this.resetRuntimeProps();
        if (hasChildren) {
            this.children = [];
        }
    }

    parent(value?: IDataNode): IDataNode {
        if (arguments.length) {
            this._parent = value;
        }
        return this._parent;
    }

    prepareProps(changes: IDataNodeProps) {
        for (let p in changes) {
            let oldValue = this.props[p];
            let newValue = changes[p];
            if (newValue === oldValue) {
                delete changes[p];
            }
        }
    }

    setProps(props, mode = ChangeMode.Model) {
        let oldProps = {};
        let propsChanged = false;
        for (let p in props) {
            let oldValue = this.props[p];
            let newValue = props[p];
            if (newValue !== oldValue) {
                propsChanged = true;
            }
            oldProps[p] = oldValue;
        }

        if (propsChanged) {
            Object.assign(this.props, props);
            this.propsUpdated(props, oldProps, mode);

            //calling trackSetProps after propsUpdated to give the primitive roots
            //the chance to get new global bounding boxes
            if (mode !== ChangeMode.Self) {
                this.trackSetProps(props, oldProps, mode);
            }
        }
    }

    prepareAndSetProps(props, mode?: ChangeMode) {
        this.prepareProps(props);
        this.setProps(props, mode);
    }

    propsUpdated(newProps, oldProps, mode) {
        if (this.runtimeProps && this.runtimeProps.trackPropsCounter) {
            PropertyTracker.changeProps(this, newProps, oldProps);
        }
    }

    getArrayPropValue(propName: string, id: string): any {
        let array = this.props[propName];
        if (!array) {
            return null;
        }

        for (let i = 0; i < array.length; i++) {
            if (array[i].id === id) {
                return array[i]
            }
        }

        return null;
    }

    patchProps(patchType: PatchType, propName: string, item: any, mode: ChangeMode = ChangeMode.Model) {
        //first track to capture old item for PatchType.Change
        if (mode !== ChangeMode.Self) {
            this.trackPatchProps(patchType, propName, item, mode);
        }
        let array;
        let current = this.props[propName];
        if (current instanceof Array) {
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

    propsPatched(patchType, propName: keyof TProps, item) {
        if (this.runtimeProps && this.runtimeProps.trackPropsCounter) {
            PropertyTracker.changeProps(this, this.selectProps([propName]), {});
        }
    }

    cloneProps() {
        return Object.assign({}, this.props);
    }

    selectProps(names: (keyof TProps)[]): Partial<TProps> {
        let result: Partial<TProps> = {};
        for (let i = 0; i < names.length; i++) {
            let p = names[i];
            result[p] = this.props[p];
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
        let idx = this.children.indexOf(child);
        if (idx !== -1) {
            this.removeChildByIndex(idx, mode);
        }
        return idx;
    }

    removeChildByIndex(index, mode = ChangeMode.Model) {
        let child = this.children.splice(index, 1)[0];
        if (mode !== ChangeMode.Self) {
            child.trackDeleted(this, index, mode);
        }

    }

    changeChildPosition(child, index, mode = ChangeMode.Model) {
        let oldIndex;
        let items = this.children;
        for (let i = items.length - 1; i >= 0; i--) {
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


    id(value?: string) {
        if (arguments.length) {
            this.setProps({ id: value }, ChangeMode.Self);
        }
        return this.props.id;
    }

    initId() {
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
        let primitiveRoot = this.primitiveRoot();
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
    trackDeleted(parent, index?: number, mode = ChangeMode.Model) {
        let primitiveRoot = parent.primitiveRoot();
        if (primitiveRoot) {
            primitiveRoot.registerDelete(parent, this, index, mode);
        }
    }

    trackInserted(parent, index, mode = ChangeMode.Model) {
        let primitiveRoot = parent.primitiveRoot();
        if (primitiveRoot) {
            primitiveRoot.registerInsert(parent, this, index, mode);
        }
    }

    trackChangePosition(parent, index, oldIndex, mode = ChangeMode.Model) {
        let primitiveRoot = parent.primitiveRoot();
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

    isEditable() {
        return true;
    }
    isFinalRoot() {
        return true;
    }

    getImmediateChildById(id: string, materialize?: boolean) {
        return DataNode.getImmediateChildById(this, id, materialize);
    }

    static getImmediateChildById(container: any, id: string, materialize: boolean = false) {
        if (!container.children) {
            return null;
        }

        let i = 0;
        let child = null;
        for (; i < container.children.length; ++i) {
            child = container.children[i];
            if (child.props.id === id) {
                break;
            }
            child = null;
        }

        if (child && materialize) {
            let materializedItem = ObjectFactory.getObject(child);
            if (child !== materializedItem) {
                child = container.children[i] = materializedItem;
            }
        }

        return child;
    }

    applyVisitorDepthFirst(callback) {
        if (this.children) {
            for (let i = 0; i < this.children.length; i++) {
                let child = this.children[i];
                if (child.applyVisitorDepthFirst(callback) === false) {
                    return false;
                }
            }
        }
        return callback(this) !== false;
    }

    applyVisitorBreadthFirst(visitor) {
        let queue = [this];
        let i = -1;
        while (++i !== queue.length) {
            let element = queue[i];
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
        let node = null;
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
        let nodes = [];
        this.applyVisitorDepthFirst(x => {
            if (func(x)) {
                nodes.push(x);
            }
        });
        return nodes;
    }
    findAncestorOfType<T extends IDataNode>(type: IConstructor<T>): T | null {
        var current = this.parent();
        while (current) {
            if (current instanceof type) {
                return current as T;
            }
            current = current.parent();
        }
        return null;
    }

    toJSON() {
        let json: any = { t: this.t, props: this.cloneProps() };
        if (this.children) {
            json.children = this.children.map(x => x.toJSON());
        }
        return json;
    }


    acquiringChild(child) {
    }

    acquiredChild(child, mode) {
    }

    fromJSON(data) {
        // TODO: consider to do server migration
        ObjectFactory.updatePropsWithPrototype(data.props);

        this.setProps(data.props, ChangeMode.Self);

        if (data.children) {
            this.children = [];
            for (let i = 0; i < data.children.length; ++i) {
                let child = ObjectFactory.getObject(data.children[i]);
                this.children.push(child);
                this.acquiredChild(child, ChangeMode.Self);
            }
        }
        return this;
    }

    isChangeAffectingLayout(changes): boolean {
        return false;
    }

    dispose() {
    }
}