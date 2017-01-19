import UIElement from "./UIElement";
import Matrix from "../math/matrix";

/**
 * Works only with DraggingElement as a parent.
 * */
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

    applyViewMatrix(context){
        this.parent().translationMatrix.applyToContext(context);
    }

    drawSelf(context, w, h, environment){
        this._element.draw(context, environment);
    }

    /** Assumes that matrix is scaled only */
    drawBoundaryPath(context, matrix){
        var m = matrix
            .appended(this.parent().translationMatrix)
            .appended(this._element.globalViewMatrix());

        //do not round so that boundary path does not flicker
        this._element.drawBoundaryPath(context, m, false);
    }
}