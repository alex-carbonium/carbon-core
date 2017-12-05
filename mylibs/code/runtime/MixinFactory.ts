import { DraggableMixin } from "./mixins/DraggableMixing";
import { IUIElement } from "carbon-core";

export class MixinFactory {
    static createForElement(type:string, element:IUIElement):any {
        switch(type) {
            case DraggableMixin.type:
                return new DraggableMixin(element);
        }

        throw "Unknown mixin type: " + type;
    }
}