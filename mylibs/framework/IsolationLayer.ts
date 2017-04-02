import Layer from './Layer';
import Context from "./render/Context";
import { IContainer, IIsolationLayer } from "carbon-core";
import { ChangeMode } from "./Defs";

export class IsolationLayer extends Layer implements IIsolationLayer {

    private ownerElement: IContainer;

    constructor() {
        super();
        App.Current.actionManager.subscribe("cancel", () => {
           this.exitIsolation();
        })
    }

    isolateGroup(owner:IContainer) : void{
        this.ownerElement = owner;
        var children = owner.children.slice();
        for(var i = 0; i < children.length; ++i) {
            var e:any = children[i];
            e.setTransform(e.globalViewMatrix());
            this.add(e, ChangeMode.Self);
        }
        this.hitTransparent(false);
    }

    exitIsolation():void {
        this.hitTransparent(true);

        var children = this.children.slice();
        for(var i = 0; i < children.length; ++i) {
            var e:any = children[i];
            e.setTransform(this.ownerElement.globalViewMatrixInverted().appended(e.globalViewMatrix()));
            this.ownerElement.add(children[i]);
        }
    }

    allowMoveOutChildren(value, event?) {
        return false
    }

    canAccept() {
        return this.isActive;
    }

    get isActive() {
        return this.children.length !== 0;
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
}