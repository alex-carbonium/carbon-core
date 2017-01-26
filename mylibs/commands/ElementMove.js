import Command from "../framework/commands/Command";
import Primitive from "../framework/sync/Primitive";

export default class ElementMove extends Command{
    constructor(element, parent, index){
        super();

        this.element = element;
        this.newParent = parent;

        // find virtual parent
        while (this.newParent) {
            var newParent = this.newParent.parent();
            if (!newParent || !newParent.getChildren || newParent.getChildren() !== this.newParent.getChildren()) {
                break;
            }
            this.newParent = newParent;
        }

        this.oldIndex = this.element.index();
        this.newIndex = index !== undefined ? index : this.oldIndex;

        this.oldParent = this.element.parent();
    }

    canExecute(){
        var oldParent = this.element.parent();

        if (oldParent !== this.newParent){
            if (!oldParent.canRemove(this.element) || !this.element.canBeRemoved()){
                return false;
            }

            if (this.newIndex === undefined){
                if (!this.newParent.canAdd(this.element)){
                    return false;
                }
            } else{
                if (!this.newParent.canInsert(this.element, this.newIndex)){
                    return false;
                }
            }
        }

        return true;
    }
    
    transparent(){
        return true;
    }
    
    execute(isRedo){
        if(this.oldParent !== this.newParent){
            this.oldParent.remove(this.element);
            this.newParent.add(this.element);
        }
        
        this.element.parent().changePosition(this.element, this.newIndex);
    }

    toPrimitiveList(){
        return [];
    }
}