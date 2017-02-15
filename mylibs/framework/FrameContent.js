import Environment from "../environment";
import UIElement from "./UIElement";
import DefaultFrameType from "../decorators/DefaultFrameType";
import ActiveFrame from "../decorators/ActiveFrame";
import PropertyMetadata from "../framework/PropertyMetadata";
import {Types} from "../framework/Defs";
import {ContentSizing} from "./Defs";

var ContentFrameType = Object.create(DefaultFrameType);
ContentFrameType.strokeStyle = null;

export default class FrameContent extends UIElement{
    constructor(frame){
        super();
        var clone = frame.clone();
        clone.prepareAndSetProps({
            sizing: ContentSizing.stretch
        });

        this._frame = frame;
        this._clone = clone;
        this._tokens = [];
    }

    clone(){
        var clone = new FrameContent(this._frame);
        clone.setProps(this.cloneProps());
        return clone;
    }

    activate(){
        this._tokens.push(Environment.controller.stopDraggingEvent.bind(this, this._onStopDragging));
    }
    deactivate(){
        this._tokens.forEach(x => x.dispose());
        this._tokens.length = 0;
    }

    propsUpdated(newProps, oldProps){
        super.propsUpdated.apply(this, arguments);

        if (newProps.hasOwnProperty("br") && this._clone){
            this._clone.setProps({br: newProps.br});
        }
    }

    drawSelf(context, w, h, environment){
        context.save();
        context.globalAlpha *= .2;
        this._clone.drawSelf(context, w, h, environment);
        context.restore();

        context.save();
        context.resetTransform();
        context.scale(Environment.view.contextScale, Environment.view.contextScale);
        environment.pageMatrix.applyToContext(context);
        context.beginPath();
        this._frame.drawBoundaryPath(context);
        context.clip();
        this.applyViewMatrix(context);
        this._clone.drawSelf(context, w, h, environment);
        context.restore();
    }

    _onStopDragging(event){
        if (event.interactiveElement.elements.length === 1 && event.interactiveElement.elements[0] === this){
            var child = event.interactiveElement.children[0];
            this.setProps(child.selectLayoutProps(true));
        }
    }

    selectionFrameType(){
        return ContentFrameType;
    }
    canRotate(){
        return false;
    }
    isDropSupported(){
        return false;
    }
    showDropTarget(){
        return false;
    }
    showResizeHint(){
        return false;
    }
    cloneWhenDragging(){
        return true;
    }
}

FrameContent.prototype.t = Types.FrameContent;

PropertyMetadata.registerForType(FrameContent, {
    groups: function(){
        return [];
    }
});