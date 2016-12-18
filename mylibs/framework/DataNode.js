import PropertyMetadata from "./PropertyMetadata";
import PropertyTracker from "./PropertyTracker";
import ModelStateListener from "./sync/ModelStateListener";
import {PatchType, ChangeMode} from "./Defs";
import ObjectFactory from "./ObjectFactory";
import {createUUID} from "../util";

//not es6 class while uielement and container are old klasses
export default klass({
    _constructor: function (hasChildren) {
        this.props = PropertyMetadata.getDefaultProps(this.t);
        this.resetRuntimeProps();
        if (hasChildren) {
            this.children = [];
        }
    },

    setProps: function (props, mode = ChangeMode.Model) {
        var oldProps = {};
        var newProps = props; //first assume all new props are different
        var propsChanged = false;
        for (var p in props) {
            var oldValue = this.props[p];
            var newValue = props[p];
            if (newValue !== oldValue) {
                propsChanged = true;
                oldProps[p] = oldValue;
                if (newProps !== props){
                    newProps[p] = newValue;
                }
            }
            //if some props are the same, extract the ones which differ
            else if (newProps === props){
                newProps = {};
                for (let p in oldProps){
                    newProps[p] = props[p];
                }
            }
        }

        if (mode !== ChangeMode.Self) {
            this.trackSetProps(newProps, oldProps, mode);
        }

        if (propsChanged) {
            Object.assign(this.props, newProps);
            this.propsUpdated(newProps, oldProps, mode);
        }
    },

    prepareAndSetProps: function (props, mode) {
        this.prepareProps(props);
        this.setProps(props, mode);
    },

    propsUpdated: function (newProps, oldProps) {
        if (this.runtimeProps && this.runtimeProps.trackPropsCounter) {
            PropertyTracker.changeProps(this, newProps, oldProps);
        }
    },

    patchProps: function (patchType, propName, item, mode = ChangeMode.Model) {
        //first track to capture old item for PatchType.Change
        if (mode !== ChangeMode.Self) {
            this.trackPatchProps(patchType, propName, item, mode);
        }
        let array;
        if(!this.props.hasOwnProperty(propName)){
            // the property exists only in prototype, need to create new one
            array = this.props[propName].splice();
            this.props[propName] = array;
        } else {
            array = this.props[propName];
        }

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
    ,
    propsPatched: function (patchType, propName, item) {
        if (this.runtimeProps && this.runtimeProps.trackPropsCounter) {
            PropertyTracker.changeProps(this, this.selectProps([propName]), {});
        }
    }
    ,

    cloneProps: function () {
        return Object.assign({}, this.props);
    },

    selectProps: function (namesOrChanges) {
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
    ,

    insertChild: function (child, index, mode = ChangeMode.Model) {
        this.children.splice(index, 0, child);

        if (mode !== ChangeMode.Self) {
            child.trackInserted(this, index, mode);
        }
    }
    ,
    removeChild: function (child, mode = ChangeMode.Model) {
        var idx = this.children.indexOf(child);
        if (idx !== -1) {
            this.removeChildByIndex(idx, mode);
        }
        return idx;
    }
    ,
    removeChildByIndex: function (index, mode = ChangeMode.Model) {
        var child = this.children.splice(index, 1)[0];
        if (mode !== ChangeMode.Self) {
            child.trackDeleted(this, index, mode);
        }

    }
    ,
    changeChildPosition: function (child, index, mode = ChangeMode.Model) {
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
    ,

    resetRuntimeProps: function () {
    }
    ,

    id: function (value) {
        if (value !== undefined) {
            this.setProps({id: value}, ChangeMode.Self);
        }
        return this.props.id;
    }
    ,
    initId: function(){
        this.id(createUUID());
    },

    primitiveRoot: function () {
        return null;
    }
    ,
    primitivePath: function () {
        return [];
    }
    ,
    primitiveRootKey: function () {
        return '';
    }
    ,

    enablePropsTracking: function () {
        if (this.runtimeProps.trackPropsCounter === undefined) {
            this.runtimeProps.trackPropsCounter = 0;
        }
        ++this.runtimeProps.trackPropsCounter;
    }
    ,
    disablePropsTracking: function () {
        if (this.runtimeProps.trackPropsCounter && --this.runtimeProps.trackPropsCounter === 0) {
            delete this.runtimeProps.trackPropsCounter;
        }
    }
    ,

    trackSetProps: function (props, oldProps, mode = ChangeMode.Model) {
        var primitiveRoot = this.primitiveRoot();
        if (primitiveRoot) {
            primitiveRoot.registerSetProps(this, props, oldProps, mode);
        }
    }
    ,
    trackPatchProps: function (patchType, propName, item, mode = ChangeMode.Model) {
        let root = this.primitiveRoot();
        if (root) {
            root.registerPatchProps(this, patchType, propName, item, mode);
        }
    },
    trackDeleted: function (parent, index, mode = ChangeMode.Model) {
        var primitiveRoot = parent.primitiveRoot();
        if (primitiveRoot) {
            primitiveRoot.registerDelete(parent, this, index, mode);
        }
    }
    ,
    trackInserted: function (parent, index, mode = ChangeMode.Model) {
        var primitiveRoot = parent.primitiveRoot();
        if (primitiveRoot) {
            primitiveRoot.registerInsert(parent, this, index, mode);
        }
    }
    ,
    trackChangePosition: function (parent, index, oldIndex, mode = ChangeMode.Model) {
        var primitiveRoot = parent.primitiveRoot();
        if (primitiveRoot) {
            primitiveRoot.registerChangePosition(parent, this, index, oldIndex, mode);
        }
    }
    ,
    registerSetProps: function (element, props, oldProps, mode = ChangeMode.Model) {
        if (mode === ChangeMode.Model) {
            ModelStateListener.trackSetProps(this, element, props, oldProps);
        }
    }
    ,
    registerPatchProps: function (element, patchType, propName, item, mode = ChangeMode.Model) {
        if (mode === ChangeMode.Model) {
            ModelStateListener.trackPatchProps(this, element, patchType, propName, item);
        }
    },

    registerDelete: function (parent, element, index, mode = ChangeMode.Model) {
        if (mode === ChangeMode.Model) {
            ModelStateListener.trackDelete(this, parent, element, index);
        }
        if (this.runtimeProps && this.runtimeProps.trackPropsCounter) {
            PropertyTracker.registerDelete(parent, element);
        }
    }
    ,

    registerInsert: function (parent, element, index, mode = ChangeMode.Model) {
        if (mode === ChangeMode.Model) {
            ModelStateListener.trackInsert(this, parent, element, index);
        }
        if (this.runtimeProps && this.runtimeProps.trackPropsCounter) {
            PropertyTracker.registerInsert(parent, element);
        }
    }
    ,

    registerChangePosition: function (parent, element, index, oldIndex, mode = ChangeMode.Model) {
        if (mode === ChangeMode.Model) {
            ModelStateListener.trackChangePosition(this, parent, element, index, oldIndex);
        }
    }
    ,

    getImmediateChildById: function (id) {
        var items = this.children;
        for (let i = 0, l = items.length; i < l; ++i) {
            let element = items[i];
            if (element.id() === id) {
                return element;
            }
        }
        return null;
    },
    applyVisitorDepthFirst: function (callback) {
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
    ,
    applyVisitorBreadthFirst: function (visitor) {
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
    ,
    findNodeBreadthFirst: function (func) {
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
    ,
    findNodeByIdBreadthFirst: function (id) {
        return this.findNodeBreadthFirst(x => x.id() === id);
    },
    findAllNodesDepthFirst: function (func) {
        var nodes = [];
        this.applyVisitorDepthFirst(x => {
            if (func(x)) {
                nodes.push(x);
            }
        });
        return nodes;
    },

    toJSON(){
        var json = {t: this.t, props: this.cloneProps()};
        if (this.children){
            json.children = this.children.map(x => x.toJSON());
        }
        return json;
    },
    fromJSON(data){
        // TODO: consider to do server migration
        ObjectFactory.updatePropsWithPrototype(data.props);

        this.setProps(data.props, ChangeMode.Self);

        if (data.children){
            this.children = data.children.map(x => ObjectFactory.fromJSON(x));
        }
        return this;
    }
})