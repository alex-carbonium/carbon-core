import GroupContainer from "../GroupContainer";
import Phantom from "../Phantom";
import {ChangeMode} from "../Defs";

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
            this.add(new Phantom(element, {
                width: element.width(),
                height: element.height(),
                m: element.globalViewMatrix()
            }));

            this._elements.push(element);
        }
        this.performArrange();

        this.showOriginal(false);

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