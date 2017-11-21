import Layer from './Layer';
import Context from "./render/Context";
import { IContainer, IUIElement, IIsolationLayer, ChangeMode, IIsolatable, LayerType, ElementState, RenderEnvironment, NodePrimitivesMap, IDisposable } from "carbon-core";
import DataNode from "./DataNode";
import Selection from "framework/SelectionModel";
import RelayoutEngine from "framework/relayout/RelayoutEngine";
import UserSettings from "../UserSettings";
import Environment from "../environment";
import NullContainer from "./NullContainer";
import Path from "framework/Path";
import Matrix from "math/matrix";

export class IsolationLayer extends Layer implements IIsolationLayer {
    private ownerElement: IIsolatable = null;
    private trackElementIds: any = {};
    private restoreMatrix: boolean = false;
    private clippingParent: IUIElement = null;
    private tokens: IDisposable[] = [];

    constructor() {
        super();

        App.Current.actionManager.subscribe("exitisolation", () => {
            var element = this.ownerElement;
            Environment.view.deactivateLayer(LayerType.Isolation);
            if (element) {
                Selection.reselect([element]);
            }
        });

        App.Current.actionManager.subscribe("cancel", () => {
            let selection = Selection.getSelection();
            let element = this.ownerElement;
            if (selection) {
                let editingPath = selection.length === 1 && selection[0] instanceof Path && selection[0].mode() === ElementState.Edit;

                if (!editingPath) {
                    Environment.view.deactivateLayer(LayerType.Isolation);
                }
            }

            if(element) {
                Selection.reselect([element]);
            }
        })
    }

    private cloneAndFollow(e: IUIElement): IUIElement {
        let clone = e.mirrorClone();
        this.trackElementIds[e.id()] = clone;

        return clone;
    }

    getOwner() {
        return this.ownerElement;
    }

    isolateGroup(owner: IIsolatable, clippingParent: IUIElement = null): void {
        if (this.ownerElement) {
            Environment.view.deactivateLayer(this.type, true);
        }

        this.clippingParent = clippingParent;
        this.ownerElement = owner;
        let children = owner.children.slice();
        for (let i = 0; i < children.length; ++i) {
            let clone = this.cloneAndFollow(children[i]);
            this.add(clone, ChangeMode.Self);
        }

        owner.setProps({ visible: false }, ChangeMode.Self);
        // set layer matrix to owner element global matrix,
        // so matrixes of the copied element should be identical to source matrices
        this.setProps(owner.selectLayoutProps(true), ChangeMode.Self);
        //mimic the same arrange strategy for correct properties display
        this.setProps({ arrangeStrategy: owner.props.arrangeStrategy }, ChangeMode.Self);
        this.hitTransparent(false);

        this.tokens.push(RelayoutEngine.rootRelayoutFinished.bind(this, this.onRootRelayoutFinished));
        this.tokens.push(RelayoutEngine.relayoutFinished.bind(this, this.onRelayoutFinished));

        Environment.view.activateLayer(this.type);
        setTimeout(()=>Selection.clearSelection(true), 0);
    }

    dblclick(event) {
        event.handled = true;
    }

    isolateObject(object: IIsolatable): void {
        if (this.ownerElement) {
            Environment.view.deactivateLayer(this.type, true);
        }


        this.add(object, ChangeMode.Self);

        // set layer matrix to owner element global matrix,
        // so matrixes of the copied element should be identical to source matrices
        this.setProps({ m: Matrix.Identity }, ChangeMode.Self);
        this.hitTransparent(false);

        this.tokens.push(App.Current.deferredChange.bind(this, this.onRootRelayoutFinished));
        this.tokens.push(App.Current.relayoutFinished.bind(this, this.onRelayoutFinished));
        Selection.clearSelection(true);

        Environment.view.activateLayer(this.type);
    }

    deactivate(): void {
        if (!this.ownerElement) {
            return;
        }
        this.hitTransparent(true);

        this.ownerElement.setProps({ visible: true }, ChangeMode.Self);
        this.ownerElement.onIsolationExited();
        this.ownerElement = null;

        this.clear();

        this.tokens.forEach(x => x.dispose());
        this.tokens.length = 0;
    }

    onRootRelayoutFinished(root, primitiveMap: NodePrimitivesMap) {
        if (primitiveMap) {
            RelayoutEngine.visitElement(this, primitiveMap, {}, true, null);

            this.setProps(this.ownerElement.selectLayoutProps(true), ChangeMode.Self);

            // owner element can be removed, we need to exit isolation mode if that happens
            let parent = this.ownerElement.parent();
            if (parent === NullContainer) {
                Environment.view.deactivateLayer(this.type);
            }
        }
    }

    allowMoveOutChildren(value, event?) {
        return false
    }

    canAccept() {
        return this.isActive;
    }

    isActivatedFor(element: IUIElement) {
        return this.isActive && this.ownerElement === element;
    }

    hitElement(/*Point*/position, scale, predicate?, directSelection?):IUIElement {
        if (!this.isActive) {
            return null;
        }

        let element = super.hitElement(position, scale, predicate, directSelection);
        return element || this;
    }

    draw(context: Context, environment: RenderEnvironment) {
        if (this.isActive) {
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

    drawSelf(context: Context, w: number, h: number, env: any) {
        if (!this.isActive) {
            return;
        }

        if (this.clippingParent) {
            context.save();
            context.beginPath();
            context.strokeStyle = UserSettings.group.active_stroke;
            this.clippingParent.drawBoundaryPath(context);
            context.stroke();
            context.clip();
        }

        super.drawSelf(context, w, h, env);

        if (this.clippingParent) {
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
        if (this.restoreMatrix) {
            this.restoreMatrix = false;
            this.setProps(this.ownerElement.selectLayoutProps(true), ChangeMode.Self);
            this.ownerElement.applyVisitor(source => {
                let target = this.getElementById(source.id());
                if (target && target !== this) {
                    target.setProps(source.selectLayoutProps(), ChangeMode.Self);
                }
            });
        }
    }

    registerSetProps(element, props, oldProps, mode = ChangeMode.Model) {
        if (!this.ownerElement) {
            return;
        }

        let sourceElement = this.ownerElement.getElementById(element.id());
        if (sourceElement) {
            if (props.m) {
                this.restoreMatrix = true;
            }

            sourceElement.setProps(props);
        }
    }

    registerPatchProps(element, patchType, propName, item, mode = ChangeMode.Model) {
        if (!this.ownerElement) {
            return;
        }

        let sourceElement = this.ownerElement.getElementById(element.id());
        if (sourceElement) {
            sourceElement.patchProps(patchType, propName, item);
        }
    }

    registerDelete(parent, element, index, mode = ChangeMode.Model) {
        if (!this.ownerElement) {
            return;
        }

        let sourceElement = this.ownerElement.getElementById(element.id());
        let sourceParent = (parent === this) ? this.ownerElement : this.ownerElement.getElementById(parent.id()) as IContainer;
        if (sourceElement && sourceParent) {
            sourceParent.remove(sourceElement);
        }

        this.restoreMatrix = true;
    }

    registerInsert(parent, element, index, mode = ChangeMode.Model) {
        if (!this.ownerElement) {
            return;
        }

        let sourceParent = (parent === this) ? this.ownerElement : this.ownerElement.getElementById(parent.id()) as IContainer;
        if (sourceParent) {
            let clone = element.mirrorClone();
            sourceParent.insert(clone, index);
        }

        this.restoreMatrix = true;
    }

    registerChangePosition(parent, element, index, oldIndex, mode = ChangeMode.Model) {
        if (!this.ownerElement) {
            return;
        }

        let sourceElement = this.ownerElement.getElementById(element.id());
        let sourceParent = (parent === this) ? this.ownerElement : this.ownerElement.getElementById(parent.id()) as IContainer;
        if (sourceElement && sourceParent) {
            sourceParent.changePosition(sourceElement, index);
        }
    }

    performArrange() {
    }
}