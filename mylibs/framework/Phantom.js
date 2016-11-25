import UIElement from "./UIElement";

export default class Phantom extends UIElement{
    constructor(element){
        super();
        this.setProps(element.getBoundaryRectGlobal());
        this._element = element;
    }

    get element(){
        return this._element;
    }

    drawSelf(context, w, h, environment){
        this._element.drawSelf(context, w, h, environment);
    }
}