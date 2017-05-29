import Layer from './Layer';
import Context from "./render/Context";
import { IContainer, IUIElement, IIsolationLayer, ChangeMode, IIsolatable, LayerTypes } from "carbon-core";
import DataNode from "./DataNode";
import Selection from "framework/SelectionModel";
import RelayoutEngine from "framework/relayout/RelayoutEngine";
import UserSettings from "../UserSettings";
import Environment from "../environment";
import NullContainer from "./NullContainer";

export class IsolationLayer extends Layer implements IIsolationLayer {

    private ownerElement: IIsolatable = null;
    private trackElementIds: any = {};
    private restoreMatrix: boolean = false;
    private clippingParent: IUIElement = null;

    constructor() {
        super();

        App.Current.actionManager.subscribe("cancel", () => {
           Environment.view.deactivateLayer(LayerTypes.Isolation);
        })
    }

    private cloneAndFollow(e:IUIElement):IUIElement {
        var clone = e.mirrorClone();
        this.trackElementIds[e.id()] = clone;

        return clone;
    }

    isolateGroup(owner: IIsolatable, clippingParent: IUIElement = null) : void{
        if (this.ownerElement) {
            Environment.view.deactivateLayer(this.type, true);
        }

        this.clippingParent = clippingParent;
        this.ownerElement = owner;
        var children = owner.children.slice();
        for(var i = 0; i < children.length; ++i) {
            var clone = this.cloneAndFollow(children[i]);
            this.add(clone, ChangeMode.Self);
        }

        owner.setProps({visible:false}, ChangeMode.Self);
        // set layer matrix to owner element global matrix,
        // so matrixes of the copied element should be identical to source matrices
        this.setProps({m:owner.globalViewMatrix(), br:owner.props.br}, ChangeMode.Self);
        this.hitTransparent(false);

        this._onAppChangedSubscription = App.Current.deferredChange.bind(this, this.onAppChanged);
        this._onRelayoutCompleted = App.Current.relayoutFinished.bind(this, this.onRelayoutFinished);
        Selection.clearSelection();

        Environment.view.activateLayer(this.type);
    }

    deactivate():void {
        if (!this.ownerElement) {
            return;
        }
        this.hitTransparent(true);

        this.ownerElement.setProps({visible:true}, ChangeMode.Self);
        this.ownerElement.onIsolationExited();
        this.ownerElement = null;

        this.clear();

        if (this._onAppChangedSubscription) {
            this._onAppChangedSubscription.dispose();
            this._onAppChangedSubscription = null;
        }
        if (this._onRelayoutCompleted) {
            this._onRelayoutCompleted.dispose();
            this._onRelayoutCompleted = null;
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
            Environment.view.deactivateLayer(this.type);
        }
    }

    allowMoveOutChildren(value, event?) {
        return false
    }

    canAccept() {
        return this.isActive;
    }

    isActivatedFor(element: IUIElement){
        return this.isActive && this.ownerElement === element;
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

        if (this.clippingParent){
            context.save();
            context.beginPath();
            context.strokeStyle = UserSettings.group.active_stroke;
            this.clippingParent.drawBoundaryPath(context);
            context.stroke();
            context.clip();
        }

        super.drawSelf(context, w, h, env);

        if (this.clippingParent){
            context.restore();
        }
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

    onRelayoutFinished() {
        if(this.restoreMatrix) {
            this.restoreMatrix = false;
            this.setProps({m:this.ownerElement.globalViewMatrix(), br:this.ownerElement.props.br}, ChangeMode.Self);
            this.ownerElement.applyVisitor(source=>{
                var target = this.getElementById(source.id());
                if(target) {
                    target.setProps({m:source.props.m, br:source.props.br}, ChangeMode.Self);
                }
            });
        }
    }

    registerSetProps(element, props, oldProps, mode = ChangeMode.Model) {
        if(!this.ownerElement) {
            return;
        }

        var sourceElement = this.ownerElement.getElementById(element.id());
        if(sourceElement) {
            if(props.m) {
                this.restoreMatrix = true;
            }

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
        var sourceParent = (parent == this)?this.ownerElement:this.ownerElement.getElementById(parent.id()) as IContainer;
        if(sourceElement && sourceParent) {
            sourceParent.remove(sourceElement);
        }
    }

    registerInsert(parent, element, index, mode = ChangeMode.Model) {
        if(!this.ownerElement) {
            return;
        }

        var sourceParent = (parent == this)?this.ownerElement:this.ownerElement.getElementById(parent.id()) as IContainer;
        if(sourceParent) {
            var clone = element.mirrorClone();
            sourceParent.insert(clone, index);
        }
    }

    registerChangePosition(parent, element, index, oldIndex, mode = ChangeMode.Model) {
        if(!this.ownerElement) {
            return;
        }

        var sourceElement = this.ownerElement.getElementById(element.id());
        var sourceParent = (parent == this)?this.ownerElement:this.ownerElement.getElementById(parent.id()) as IContainer;
        if(sourceElement && sourceParent) {
            sourceParent.changePosition(sourceElement, index);
        }
    }

}