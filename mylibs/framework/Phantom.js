import UIElement from "./UIElement";

export default class Phantom extends UIElement{
    constructor(element, props){
        super();
        this._element = element;

        if (props){
            this.prepareAndSetProps(props);
        }
    }

    get original(){
        return this._element;
    }

    shouldApplyViewMatrix(){
        return true;
    }

    drawSelf(context, w, h, environment){
        this._element.clip(context, 0, 0, w, h);
        this._element.drawSelf(context, w, h, environment);
    }
}