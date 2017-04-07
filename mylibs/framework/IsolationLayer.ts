import Layer from './Layer';
import Context from "./render/Context";
import { IContainer, IUIElement, IIsolationLayer } from "carbon-core";
import { ChangeMode, PrimitiveType } from "./Defs";
import DataNode from "./DataNode";
import Selection from "framework/SelectionModel";
import RelayoutEngine from "framework/relayout/RelayoutEngine";

export class IsolationLayer extends Layer implements IIsolationLayer {

    private ownerElement: IContainer;
    private trackElementIds: any = {};

    constructor() {
        super();
        this.ownerElement = null;
        App.Current.actionManager.subscribe("cancel", () => {
           this.exitIsolation();
        })
    }

    private cloneAndFollow(e:IUIElement):IUIElement {
        var clone = e.clone();
        clone.id(e.id());
        this.trackElementIds[e.id()] = clone;

        return clone;
    }

    isolateGroup(owner:IContainer) : void{
        this.ownerElement = owner;
        var children = owner.children.slice();
        var selection = [];
        for(var i = 0; i < children.length; ++i) {
            var clone = this.cloneAndFollow(children[i]);
            this.add(clone, ChangeMode.Self);
            selection.push(clone);
        }

        this.setTransform(owner.globalViewMatrix());
        this.id(owner.id());
        owner.setProps({visible:false, br:this.props.br}, ChangeMode.Self);
        this.hitTransparent(false);

        this._onAppChangedSubscription = App.Current.deferredChange.bind(this, this.onAppChanged);
        Selection.clearSelection();
    }

    exitIsolation():void {
        if(!this.ownerElement) {
            return;
        }
        this.hitTransparent(true);

        this.ownerElement.setProps({visible:true}, ChangeMode.Self);
        this.ownerElement = null;

        this.clear();

        if(this._onAppChangedSubscription) {
            this._onAppChangedSubscription.dispose();
            this._onAppChangedSubscription = null;
        }

        Selection.clearSelection();
        Selection.refreshSelection();
    }

    onAppChanged(primitiveMap:any) {
        var that = this;

        var refreshState = false;

        RelayoutEngine.visitElement(this, primitiveMap, {}, true, null);

        // owner element can be removed, we need to exit isolation mode if that happens
        let parent = this.ownerElement.parent();
        if(parent === NullContainer) {
            this.exitIsolation();
        }
    }

    allowMoveOutChildren(value, event?) {
        return false
    }

    canAccept() {
        return this.isActive;
    }

    get isActive() {
        return this.ownerElement !== null;
    }

    hitElement(/*Point*/position, scale, predicate, directSelection) {
        if(!this.isActive) {
            return null;
        }

        var element = super.hitElement(position, scale, predicate, directSelection);
        return element || this;
    }

    draw(context:Context, environment:any){
        if(this.isActive) {
            context.save();
            context.beginPath();
            context.fillStyle = "rgba(255,255,255,0.6)";
            context.resetTransform();
            context.rect(0, 0, context.canvas.width, context.canvas.height);
            context.fill();
            context.restore();
        }
        super.draw(context, environment);
    }

    drawSelf(context:Context, w:number, h:number, env:any) {
        if(!this.isActive) {
            return;
        }

        super.drawSelf(context, w, h, env);
    }

    primitiveRoot() {
        return this;
    }

    primitivePath() {
        return null;
    }

    primitiveRootKey() {
        return null;
    }

    relayout() {
    }

    relayoutCompleted() {
    }

    registerSetProps(element, props, oldProps, mode = ChangeMode.Model) {
        if(!this.ownerElement) {
            return;
        }

        var sourceElement = this.ownerElement.getElementById(element.id());
        if(sourceElement) {
            sourceElement.setProps(props);
        }
    }

    registerPatchProps(element, patchType, propName, item, mode = ChangeMode.Model) {
        if(!this.ownerElement) {
            return;
        }

        var sourceElement = this.ownerElement.getElementById(element.id());
        if(sourceElement) {
            sourceElement.patchProps(patchType, propName, item);
        }
    }

    registerDelete(parent, element, index, mode = ChangeMode.Model) {
        if(!this.ownerElement) {
            return;
        }

        var sourceElement = this.ownerElement.getElementById(element.id());
        if(sourceElement) {
            this.ownerElement.remove(sourceElement);
        }
    }

    registerInsert(parent, element, index, mode = ChangeMode.Model) {
        if(!this.ownerElement) {
            return;
        }

        var clone = element.clone();
        clone.id(element.id());
        this.ownerElement.insert(clone, index);
    }

    registerChangePosition(parent, element, index, oldIndex, mode = ChangeMode.Model) {
        if(!this.ownerElement) {
            return;
        }

        var sourceElement = this.ownerElement.getElementById(element.id());
        if(sourceElement) {
            this.ownerElement.changePosition(sourceElement, index);
        }
    }
}