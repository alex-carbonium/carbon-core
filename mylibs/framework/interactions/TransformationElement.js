import {Types} from "../Defs";
import PropertyMetadata from "../PropertyMetadata";
import InteractiveElement from "./InteractiveElement";
import ArrangeStrategy from "../ArrangeStrategy";

export default class TransformationElement extends InteractiveElement{
    constructor(element){
        super(element);

        this._lastScaling = null;
        this._lastRotation = null;
    }

    createClone(element){
        var clone = element.clone();
        clone.setProps(element.selectLayoutProps(true));
        clone.runtimeProps.isTransformationClone = true;
        return clone;
    }

    applySizeScaling(s, o, options){
        super.applySizeScaling(s, o, options);
        this._lastScaling = {s, o, options};
    }

    applyRotation(angle, o, withReset, mode){
        super.applyRotation(angle, o, withReset, mode);
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
                var sameDirection = this.children.length === 1 || this.isRotated();
                var round = this._lastScaling.options.round && this.children.length === 1;                
                var resizeOptions = this._lastScaling.options.withSameDirection(sameDirection);
                resizeOptions = resizeOptions.withReset(false).withRounding(round);
                element.applyScaling(this._lastScaling.s, localOrigin, resizeOptions);
            }
            if (this._lastRotation){
                element.setTransform(element.parent().globalViewMatrixInverted().appended(clone.globalViewMatrix()));
            }
        }

        if (this._lastScaling || this._lastRotation){
            ArrangeStrategy.arrangeRoots(this.elements);
        }
        this.refreshSelection();
    }
}

TransformationElement.prototype.t = Types.TransformationElement;

PropertyMetadata.registerForType(TransformationElement, {});