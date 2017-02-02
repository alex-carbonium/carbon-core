import UIElement from "./UIElement";
import Environment from "../environment";
import GlobalMatrixModifier from "./GlobalMatrixModifier";

/**
 * Works only with DraggingElement as a parent.
 * */
export default class Phantom extends UIElement {
    constructor(element, props) {
        super();
        this._element = element;

        if (props) {
            this.prepareAndSetProps(props);
        }
    }

    get original() {
        return this._element;
    }

    applyViewMatrix(context) {
        this.parent().translationMatrix.applyToContext(context);
    }

    drawSelf(context, w, h, environment) {
        this._element.draw(context, environment);
    }

    drawBoundaryPath(context) {
        try {
            GlobalMatrixModifier.push(m => Environment.view.scaleMatrix
                .appended(this.parent().translationMatrix)
                .appended(m)
            );            

            //do not round so that boundary path does not flicker
            this._element.drawBoundaryPath(context, false);
        }
        finally {
            GlobalMatrixModifier.pop();
        }
    }
}