import UIElement from "./GroupContainer";
import {ChangeMode, Types} from "./Defs";
import PropertyMetadata from "./PropertyMetadata";
import SelectComposite from "./SelectComposite";
import Brush from "./Brush";

export default class ResizingElement extends UIElement{
    constructor(element){
        super();

        this.props.stroke = Brush.createFromColor("red");

        var elements = element instanceof SelectComposite ? element.elements : [element];
        for (var i = 0; i < elements.length; i++){
            var e = elements[i];
            var clone = e.clone();
            clone.setProps(e.getBoundaryRectGlobal());
            this.add(clone);
        }

        if (elements.length === 1){
            var angle = elements[0].globalViewMatrix().getRotation();
            this.setProps({angle: angle});
            this.children[0].setProps({angle: 0});
        }

        this.performArrange();
        this._elements = elements;

        this.showOriginal(false);
    }

    showOriginal(value){
        this._elements.forEach(x => x.setProps({visible: value}, ChangeMode.Self));
    }

    saveChanges(){
        this.showOriginal(true);

        for (var i = 0; i < this.children.length; i++){
            var clone = this.children[i];
            var element = this._elements[i];
            var newWidth = clone.width();
            var newHeight = clone.height();

            var newMatrixProps = clone.globalViewMatrix().decompose();
            var props = {
                width: newWidth,
                height: newHeight
            };

            var oldPos = clone.globalViewMatrix().transformPoint2(0, 0);
            var oldOrigin = clone.rotationOrigin(true);

            var newPos = element.parent().globalViewMatrixInverted().transformPoint(oldPos);
            var newOrigin = element.parent().globalViewMatrixInverted().transformPoint(oldOrigin);

            newPos = sketch.math2d.rotatePoint(newPos, newMatrixProps.rotation * Math.PI / 180, newOrigin);

            Object.assign(props, newPos);
            props.angle = newMatrixProps.rotation;

            element.prepareAndSetProps(props);
        }
    }

    detach(){
        this.parent().remove(this, ChangeMode.Self);
    }
}

ResizingElement.prototype.t = Types.ResizingElement;

PropertyMetadata.registerForType(ResizingElement, {});