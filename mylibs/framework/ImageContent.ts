import UIElement from "./UIElement";
import DefaultFrameType from "../decorators/DefaultFrameType";
import PropertyMetadata from "./PropertyMetadata";
import {Types} from "./Defs";
import {ContentSizing} from "carbon-model";
import GlobalMatrixModifier from "./GlobalMatrixModifier";
import CoreIntl from "../CoreIntl";
import { IMouseEventData, IUIElement, IComposite, InteractionType, RenderEnvironment } from "carbon-core";

var ContentFrameType = Object.create(DefaultFrameType);
ContentFrameType.strokeStyle = null;

export default class ImageContent extends UIElement{
    constructor(frame){
        super();
        var clone = frame.clone();
        clone.prepareAndSetProps({
            sizing: ContentSizing.stretch
        });

        var name = CoreIntl.instance.formatMessage({
            id: this.displayType(),
            defaultMessage: this.displayType()
        });
        this.name = (name);

        this._frame = frame;
        this._clone = clone;
        this._tokens = [];
    }

    clone(){
        var clone = new ImageContent(this._frame);
        clone.setProps(this.cloneProps());
        return clone;
    }

    activate(controller){
        this._tokens.push(controller.interactionStopped.bind(this, this.onInteractionStopped));
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

    drawSelf(context, w, h, environment: RenderEnvironment){
        context.save();
        context.globalAlpha *= .2;
        this._clone.drawSelf(context, w, h, environment);
        context.restore();

        context.save();
        context.resetTransform();
        context.scale(environment.contextScale, environment.contextScale);
        environment.pageMatrix.applyToContext(context);
        context.beginPath();
        this._frame.drawBoundaryPath(context);
        context.clip();
        this.applyViewMatrix(context);
        this._clone.drawSelf(context, w, h, environment);
        context.restore();
    }

    drawBoundaryPath(context, round) {
    }

    onInteractionStopped(type: InteractionType, event: IMouseEventData, element: IComposite){
        if (type === InteractionType.Dragging && element.elements.length === 1 && element.elements[0] === this){
            this.setProps(element.selectLayoutProps(true));
        }
    }

    selectionFrameType(){
        return ContentFrameType;
    }
    canDrag() {
        return true;
    }
    canRotate(){
        return false;
    }
    canBeAccepted() {
        return false;
    }
    showResizeHint(){
        return false;
    }

    click(event: IMouseEventData) {
        //to avoid selection being reset when clicking on content
        event.handled = true;
    }
}

ImageContent.prototype.t = Types.ImageContent;

PropertyMetadata.registerForType(ImageContent, {
    groups: function(){
        return [];
    }
});