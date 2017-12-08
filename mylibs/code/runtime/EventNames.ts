import { MouseEventHandler, MouseEvent, PointerEvent } from "carbon-runtime";

// this class is only needed to make sure we expose all event of MouseEventHandler
// if you add new event to MouseEventhandler it must be implemented here
class EventNamesType implements MouseEventHandler {
    onClick(e?: MouseEvent): boolean | void | Promise<boolean | void> { return false; }
    onDblClick(e?: MouseEvent): boolean | void | Promise<boolean | void> { return false; }
    onMouseDown(e?: MouseEvent): boolean | void | Promise<boolean | void> { return false; }
    onMouseUp(e?: MouseEvent): boolean | void | Promise<boolean | void> { return false; }
    onMouseMove(e?: MouseEvent): boolean | void | Promise<boolean | void> { return false; }
    onMouseEnter(e?: MouseEvent): boolean | void | Promise<boolean | void> { return false; }
    onMouseLeave(e?: MouseEvent): boolean | void | Promise<boolean | void> { return false; }
    onMouseWheel(e?: MouseEvent): boolean | void | Promise<boolean | void> { return false; }
    onPanMove(e?: PointerEvent): boolean | void | Promise<boolean | void> { return false; }
    onPanStart(e?: PointerEvent): boolean | void | Promise<boolean | void> { return false; }
    onPanEnd(e?: PointerEvent): boolean | void | Promise<boolean | void> { return false; }
    onPinch(e?: PointerEvent): boolean | void | Promise<boolean | void> { return false; }
    onPinchStart(e?: PointerEvent): boolean | void | Promise<boolean | void> { return false; }
    onPinchEnd(e?: PointerEvent): boolean | void | Promise<boolean | void> { return false; }
    onTap(e?: PointerEvent): boolean | void | Promise<boolean | void> { return false; }
    onDoubleTap(e?: PointerEvent): boolean | void | Promise<boolean | void> { return false; }
    onTextInput (e: MouseEvent) { return false;}
}

export var EventNames = new EventNamesType();