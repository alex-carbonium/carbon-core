import GroupContainer from "./GroupContainer";
import {ChangeMode, Types} from "./Defs";
import PropertyMetadata from "./PropertyMetadata";
import SelectComposite from "./SelectComposite";
import UIElement from "./UIElement";
import Brush from "./Brush";

export default class ResizingElement extends GroupContainer{
    constructor(element){
        super();

        this.props.stroke = Brush.createFromColor("red");

        var elements = element instanceof SelectComposite ? element.elements : [element];
        for (var i = 0; i < elements.length; i++){
            var e = elements[i];
            var clone = e.clone();
            clone.setProps({
                width: e.width(),
                height: e.height(),
                m: e.globalViewMatrix()
            });
            this.add(clone);
        }

        this.performArrange();

        this._elements = elements;

        this.showOriginal(false);
    }

    applySizeScaling(s, o, sameDirection, withReset){
        var localOrigin = this.viewMatrixInverted().transformPoint(o);
        this.children.forEach(e => e.applyScaling(s, localOrigin, false, withReset));

        this._lastScaling = {s, o, sameDirection};
    }

    showOriginal(value){
        this._elements.forEach(x => x.setProps({visible: value}, ChangeMode.Self));
    }

    saveChanges(){
        this.showOriginal(true);

        for (var i = 0; i < this.children.length; i++){
            var element = this._elements[i];

            if (this._lastScaling){
                var localOrigin = element.parent().globalViewMatrixInverted().transformPoint(this._lastScaling.o);
                element.applyScaling(this._lastScaling.s, localOrigin, this._lastScaling.sameDirection);
            }
        }
    }

    detach(){
        this.parent().remove(this, ChangeMode.Self);
    }
}

ResizingElement.prototype.t = Types.ResizingElement;

PropertyMetadata.registerForType(ResizingElement, {});