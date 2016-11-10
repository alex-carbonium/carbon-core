import UIElement from "./UIElement";
import DefaultFrameType from "../decorators/DefaultFrameType";
import ActiveFrame from "../decorators/ActiveFrame";

var ContentFrameType = Object.create(DefaultFrameType);
ContentFrameType.strokeStyle = null;

export default class FrameContent extends UIElement{
    constructor(frame, cropRect){
        super();
        this._frame = frame;
        this._cropRect = cropRect;
        this._activeFrame = null;
    }

    activate(){
        this._activeFrame = new ActiveFrame();
        this.addDecorator(this._activeFrame);
    }
    deactivate(){
        if (this._activeFrame){
            this.removeDecorator(this._activeFrame);
            this._activeFrame = null;
        }
    }

    propsUpdated(newProps, oldProps){
        super.propsUpdated.apply(this, arguments);

        var props = null;
        if (newProps.hasOwnProperty("width")){
            props = props || {};
            props.width = newProps.width;
        }
        if (newProps.hasOwnProperty("height")){
            props = props || {};
            props.height = newProps.height;
        }
        if (props){
            this._frame.setProps(props);
        }
    }

    drawSelf(context, w, h, environment){
        context.save();
        context.globalAlpha *= .2;
        this._frame.draw(context, environment);
        context.restore();
    }

    selectionFrameType(){
        return ContentFrameType;
    }
    cloneWhenDragging(){
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
}

FrameContent.prototype._angleEditable = false;