import { MouseEventHandler, MouseEvent } from "carbon-runtime";

// this class is only needed to make sure we expose all event of MouseEventHandler
// if you add new event to MouseEventhandler it must be implemented here
class EventNamesType implements MouseEventHandler {
    onclick (e: MouseEvent) { return false;}
    onmousedown (e: MouseEvent)  { return false;}
    onmouseup (e: MouseEvent) { return false;}
    onmousemove (e: MouseEvent) { return false;}
    onmouseenter (e: MouseEvent) { return false;}
    onmouseleave (e: MouseEvent) { return false;}
    onTextInput (e: MouseEvent) { return false;}
}

export var EventNames = new EventNamesType();