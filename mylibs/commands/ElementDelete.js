import Command from "../framework/commands/Command";
import Primitive from "../framework/sync/Primitive";
import Selection from "framework/SelectionModel";

export default class ElementDelete extends Command{
    constructor(element) {
        super();
        this.element = element;
    }

    transparent(){
        return true;
    }

    execute(){
        this.element.parent().remove(this.element);
        Selection.makeSelection([]);
    }
}