import Layer from './Layer';
import Context from "./render/Context";
import { IContainer, IUIElement, IIsolationLayer, Dictionary } from "carbon-core";
import { ChangeMode, PrimitiveType } from "./Defs";
import DataNode from "./DataNode";
import Selection from "framework/SelectionModel";
import RelayoutEngine from "framework/relayout/RelayoutEngine";

export class IsolationLayer extends Layer implements IIsolationLayer {

    private ownerElement: IContainer;
    private trackElementIds: Dictionary = {};
    private restoreMatrix: boolean;

    constructor() {
        super();
        this.ownerElement = null;
        App.Current.actionManager.subscribe("cancel", () => {
           this.exitIsolation();
        })
    }

    private cloneAndFollow(e:IUIElement):IUIElement {
        var clone = e.mirrorClone();
        clone.runtimeProps.isolationSource = e;
        this.trackElementIds[e.id()] = clone;

        return clone;
    }

    isolateGroup(owner:IContainer) : void{
        if(this.ownerElement) {
            this.exitIsolation();
        }

        // we can try to isolate isolated copy, need to take a real instance instead
        if(owner.runtimeProps.isolationSource) {
            owner = owner.runtimeProps.isolationSource;
        }

        this.ownerElement = owner;
        var children = owner.children.slice();
        var selection = [];
        for(var i = 0; i < children.length; ++i) {
            var clone = this.cloneAndFollow(children[i]);
            this.add(clone, ChangeMode.Self);
            selection.push(clone);
        }

       // this.id(owner.id());
        owner.setProps({visible:false}, ChangeMode.Self);
        // set layer matrix to owner element global matrix,
        // so matrixes of the copied element should be identical to source matrices
        this.setProps({m:owner.globalViewMatrix(), br:owner.props.br}, ChangeMode.Self);
        this.hitTransparent(false);

        this._onAppChangedSubscription = App.Current.deferredChange.bind(this, this.onAppChanged);
        this._onRelayoutCompleted = App.Current.relayoutFinished.bind(this, this.onRelayoutFinished);
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
            element.runtimeProps.isolationSource = clone;
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