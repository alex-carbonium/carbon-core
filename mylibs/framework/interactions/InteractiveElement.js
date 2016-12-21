import GroupContainer from "../GroupContainer";
import {ChangeMode, Types} from "../Defs";
import Phantom from "../Phantom";
import Brush from "../Brush";
import PropertyMetadata from "../PropertyMetadata";
import UserSettings from "../../UserSettings";

export default class InteractiveElement extends GroupContainer{
    constructor(elements) {
        super();

        this._decorators = [];
        this._elements = [];

        for (var i = 0; i < elements.length; i++){
            var element = elements[i];
            if (element.decorators){
                element.decorators.forEach(x => {
                    x.visible(false);
                    this._decorators.push(x);
                });
            }
            this.add(this.createClone(element));

            this._elements.push(element);
        }
        this.performArrange();

        this.showOriginal(false);
    }

    createClone(element){
        return new Phantom(element, element.selectLayoutProps(true));
    }

    showOriginal(value){
        this._elements.forEach(x => x.setProps({visible: value}, ChangeMode.Self));
    }

    saveChanges(){
        this.showOriginal(true);
    }

    detach(){
        if (this._decorators){
            this._decorators.forEach(x => x.visible(true));
            this._decorators = null;
        }

        this.parent().remove(this, ChangeMode.Self);
    }

    hitTest() {
        return false;
    }

    canDrag(){
        return false;
    }

    isTemporary(){
        return true;
    }

    get elements(){
        return this._elements;
    }
}

InteractiveElement.prototype.t = Types.InteractiveElement;

PropertyMetadata.registerForType(InteractiveElement, {
    stroke: {
        defaultValue: Brush.createFromColor(UserSettings.frame.stroke)
    }
});