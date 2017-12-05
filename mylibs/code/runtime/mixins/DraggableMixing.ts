import { IUIElement, IRuntimeMixin } from "carbon-core";

export class DraggableMixin implements IRuntimeMixin {
    public static type: string = "draggable";

    constructor(private element:IUIElement) {
    }

    set(target: any, name: PropertyKey, value: any) {
        return false;
    }

    get(target: any, name: PropertyKey):any
    {
        if(name === "draggable") {
            return this.draggable;
        }

        return;
    }

    has(target:any, name:PropertyKey):boolean {
        if(name === "draggable") {
            return true;
        }

        return false;
    }

    public get draggable() {
        alert('afadfadf')
        return {};
    }
}