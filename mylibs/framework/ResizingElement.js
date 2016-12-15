import GroupContainer from "./GroupContainer";
import {ChangeMode, Types} from "./Defs";
import PropertyMetadata from "./PropertyMetadata";
import SelectComposite from "./SelectComposite";
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

            var origAngle = element.globalViewMatrix().getRotation();
            var deltaAngle = newMatrixProps.rotation - origAngle;
            props.angle  = element.angle() + deltaAngle;

            var oldPos = clone.globalViewMatrix().transformPoint2(0, 0);
            var oldOrigin = clone.rotationOrigin(true);

            var newPos = element.parent().globalViewMatrixInverted().transformPoint(oldPos);
            var newOrigin = element.parent().globalViewMatrixInverted().transformPoint(oldOrigin);

            newPos = sketch.math2d.rotatePoint(newPos, props.angle * Math.PI / 180, newOrigin);

            Object.assign(props, newPos);

            //element.prepareAndSetProps(props);
            element.prepareAndSetProps({
                m: element.parent().globalViewMatrixInverted().appended(clone.globalViewMatrix()),
                width: newWidth,
                height: newHeight
            });
        }
    }

    detach(){
        this.parent().remove(this, ChangeMode.Self);
    }
}

ResizingElement.prototype.t = Types.ResizingElement;

PropertyMetadata.registerForType(ResizingElement, {});