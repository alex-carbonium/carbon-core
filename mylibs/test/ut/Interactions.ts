import { Workspace, IMouseEventData, KeyboardState, IUIElement, IView, IController } from "carbon-core";

const defaultKeys: KeyboardState = {altKey: false, ctrlKey: false, shiftKey: false};

export function dragElementOnElement(view:IView, controller:IController, source: IUIElement, target: IUIElement, keys: Partial<KeyboardState> = defaultKeys) {
    let bbox1 = source.getBoundingBoxGlobal();
    let bbox2 = target.getBoundingBoxGlobal();
    drag(view, controller, bbox1.x + bbox1.width/2, bbox1.y + bbox1.height/2, bbox2.x + bbox2.width/2, bbox2.y + bbox2.height/2, keys);
}

export function dragElement(view:IView, controller:IController, element: IUIElement, destX: number, destY: number, keys: Partial<KeyboardState> = defaultKeys) {
    let bbox = element.getBoundingBoxGlobal();
    drag(view, controller, bbox.x + bbox.width/2, bbox.y + bbox.height/2, destX, destY, keys);
}

export function drag(view:IView, controller:IController, x1: number, y1: number, x2: number, y2: number, keys: Partial<KeyboardState> = defaultKeys) {
    mousedown(view, controller, x1, y1);

    mousemove(view, controller, x1, y1);
    mousemove(view, controller, x1 + (x2 - x1)/2, y1 + (y2 - y1)/2);
    mousemove(view, controller, x2, y2);

    //simulating drop with key being pressed and then mouse up with the same key
    if (keys !== defaultKeys) {
        keys = Object.assign({}, defaultKeys, keys);
        Workspace.keyboard.change(keys.ctrlKey, keys.shiftKey, keys.altKey);
    }
    mouseup(view, controller, x2, y2, keys);
}

export function mousedown(view:IView, controller:IController, x: number, y: number, keys: Partial<KeyboardState> = defaultKeys) {
    let e = createEventData(view, controller, x, y, keys);
    controller.onmousedown(e)
}

export function mousemove(view:IView, controller:IController, x: number, y: number, keys: Partial<KeyboardState> = defaultKeys) {
    let e = createEventData(view, controller, x, y, keys);
    controller.onmousemove(e)
}

export function mouseup(view:IView, controller:IController, x: number, y: number, keys: Partial<KeyboardState> = defaultKeys) {
    let e = createEventData(view, controller, x, y, keys);
    controller.onmouseup(e)
}

function createEventData(view:IView, controller:IController, x: number, y: number, keys: Partial<KeyboardState> = defaultKeys) {
    keys = Object.assign({}, defaultKeys, keys);
    let data: IMouseEventData = {
        x,
        y,
        handled: false,
        altKey: keys.altKey,
        ctrlKey: keys.ctrlKey,
        shiftKey: keys.shiftKey,
        cursor: null,
        view:view,
        controller:controller
    };
    return data;
}