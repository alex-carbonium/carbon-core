import {Types} from "../Defs";
import PropertyMetadata from "../PropertyMetadata";
import InteractiveElement from "./InteractiveElement";
import ArrangeStrategy from "../ArrangeStrategy";

export default class TransformationElement extends InteractiveElement{
    constructor(elements){
        super(elements);

        this._lastScaling = null;
        this._lastRotation = null;
    }

    createClone(element){
        var clone = element.clone();
        clone.setProps(element.selectLayoutProps(true));
        return clone;
    }

    applySizeScaling(s, o, sameDirection, withReset){
        super.applySizeScaling(s, o, sameDirection, withReset);
        this._lastScaling = {s, o, sameDirection};
    }

    applyRotation(angle, o, withReset){
        super.applyRotation(angle, o, withReset);
        this._lastRotation = {angle, o};
    }

    saveChanges(){
        super.saveChanges();

        for (var i = 0; i < this.children.length; i++){
            var element = this.elements[i];
            var clone = this.children[i];

            if (this._lastScaling){
                var globalOrigin = this._lastScaling.o;
                var localOrigin = element.parent().globalViewMatrixInverted().transformPoint(globalOrigin);
                element.applyScaling(this._lastScaling.s, localOrigin, this._lastScaling.sameDirection);
            }
            if (this._lastRotation){
                element.setTransform(element.parent().globalViewMatrixInverted().appended(clone.globalViewMatrix()));
            }
        }

        ArrangeStrategy.arrangeRoots(this.elements);
    }
}

TransformationElement.prototype.t = Types.TransformationElement;

PropertyMetadata.registerForType(TransformationElement, {});