import { workspace, IMouseEventData, KeyboardState, IUIElement } from "carbon-core";

const defaultKeys: KeyboardState = {altKey: false, ctrlKey: false, shiftKey: false};

export function dragElementOnElement(source: IUIElement, target: IUIElement, keys: Partial<KeyboardState> = defaultKeys) {
    let bbox1 = source.getBoundingBoxGlobal();
    let bbox2 = target.getBoundingBoxGlobal();
    drag(bbox1.x + bbox1.width/2, bbox1.y + bbox1.height/2, bbox2.x + bbox2.width/2, bbox2.y + bbox2.height/2, keys);
}

export function dragElement(element: IUIElement, destX: number, destY: number, keys: Partial<KeyboardState> = defaultKeys) {
    let bbox = element.getBoundingBoxGlobal();
    drag(bbox.x + bbox.width/2, bbox.y + bbox.height/2, destX, destY, keys);
}

export function drag(x1: number, y1: number, x2: number, y2: number, keys: Partial<KeyboardState> = defaultKeys) {
    mousedown(x1, y1);

    mousemove(x1, y1);
    mousemove(x1 + (x2 - x1)/2, y1 + (y2 - y1)/2);
    mousemove(x2, y2);

    //simulating drop with key being pressed and then mouse up with the same key
    if (keys !== defaultKeys) {
        keys = Object.assign({}, defaultKeys, keys);
        workspace.keyboard.change(keys.ctrlKey, keys.shiftKey, keys.altKey);
    }
    mouseup(x2, y2, keys);
}

export function mousedown(x: number, y: number, keys: Partial<KeyboardState> = defaultKeys) {
    let e = createEventData(x, y, keys);
    workspace.controller.onmousedown(e)
}

export function mousemove(x: number, y: number, keys: Partial<KeyboardState> = defaultKeys) {
    let e = createEventData(x, y, keys);
    workspace.controller.onmousemove(e)
}

export function mouseup(x: number, y: number, keys: Partial<KeyboardState> = defaultKeys) {
    let e = createEventData(x, y, keys);
    workspace.controller.onmouseup(e)
}

function createEventData(x: number, y: number, keys: Partial<KeyboardState> = defaultKeys) {
    keys = Object.assign({}, defaultKeys, keys);
    let data: IMouseEventData = {
        x,
        y,
        handled: false,
        altKey: keys.altKey,
        ctrlKey: keys.ctrlKey,
        shiftKey: keys.shiftKey,
        cursor: null,
        view:{scale:()=>1} as any,
        controller:null
    };
    return data;
}