import {areRectsIntersecting} from "math/math";
import EventHelper from "./EventHelper";
import Selection from "./SelectionModel";
import CompositeElement from "./CompositeElement";
import domUtil from "utils/dom";
import Cursor from "./Cursor";
import Invalidate from "./Invalidate";
import actionManager from "ui/ActionManager";
import RepeatViewListener from "./repeater/RepeatViewListener";
import TouchHelper from "./TouchHelper";
import Artboard from "./Artboard";
import Page from "./Page";
import Keyboard from "../platform/Keyboard";
import GroupContainer from "./GroupContainer";
import Phantom from "./Phantom";
import ObjectFactory from "./ObjectFactory";
import {Types} from "./Defs";

function onselect(rect) {
    var selection = this.app.activePage.getElementsInRect(rect);

    Selection.makeSelection(selection);
}

function stopDrag(event) {
    if (!this._draggingElement.isDropSupported()) {
        this._draggingElement.detach();
        this.stopDraggingEvent.raise(event, null);
        return false;
    }


    var elements = this._draggingElement.drop(event, this._draggingOverElement, this.app.activePage);
    this._draggingElement.detach();

    // if (group !== null) {
    //     //TODO
    //     if(group.props._unwrapContent){
    //         group.unwrapToParent();
    //     }
    // }

    this.stopDraggingEvent.raise(event, elements);

    //could start dragging not selected object
    Selection.makeSelection(elements);
}

function updateEvent(event) {
    var scale = this.view.scale();
    domUtil.layerX(event, Math.round((domUtil.layerX(event) + this.view.scrollX()) * 100 / scale) / 100);
    domUtil.layerY(event, Math.round((domUtil.layerY(event) + this.view.scrollY()) * 100 / scale) / 100);
    event._ctrlKey = event.ctrlKey || event.metaKey;
    event._scale = scale;
}

function _handleDraggingOver(mousePoint, draggingElement, eventData) {
    var scale = this.view.scale();
    var dragOverElement = null;

    var element = this.app.activePage.hitElementDirect(mousePoint, scale, function (position, scale) {
        var descendantOrSelf = false;
        var that = this;
        draggingElement.elements.forEach(function (e) {
            descendantOrSelf = that.isDescendantOrSame(e);
            if (descendantOrSelf) {
                return false;
            }
        });
        if (!descendantOrSelf && this.hitTest(position, scale)) {
            return true;
        }

        return false;
    });

    while (element !== null) {
        if (element.canAccept(draggingElement.elements, undefined, eventData.event.ctrlKey)) {
            dragOverElement = element;
            break;
        }
        element = element.parent();
    }

    if (this._draggingOverElement !== null && this._draggingOverElement !== dragOverElement) {
        this._draggingOverElement.draggingLeft(eventData);
        this.draggingLeftEvent.raise(eventData);
        this._draggingOverElement = null;
    }
    eventData.target = dragOverElement;

    if (dragOverElement !== this._draggingOverElement) {
        this._draggingOverElement = dragOverElement;
        if (this._draggingOverElement) {
            this._draggingOverElement.draggingEnter(eventData);
        }
        this.draggingEnterEvent.raise(eventData);
    }
}

function dragging(event) {
    var draggingElement = this._draggingElement;
    var eventData = {
        handled: false,
        draggingElement: this._draggingElement,
        x: event.x,
        y: event.y,
        mouseX: event.mouseX,
        mouseY: event.mouseY,
        target: this._draggingOverElement,
        event: event
    };

    var mousePoint = {x: eventData.mouseX, y: eventData.mouseY};

    if (this._draggingElement.allowMoveOutChildren(event)) {
        _handleDraggingOver.call(this, mousePoint, draggingElement, eventData);
    }

    this._draggingElement.dragTo(eventData);

    this.draggingEvent.raise(eventData);
}

export default class DesignerController {
    _updateCursor(eventData) {
        if (Cursor.hasGlobalCursor()){
            return;
        }

        if (eventData){
            if (eventData.cursor){
                Cursor.setCursor(eventData.cursor);
                return;
            }

            for (var i = 0; i < this.view._layersReverse.length; i++) {
                var layer = this.view._layersReverse[i];
                var element = layer.hitElement(eventData, this.view.scale());
                if (element !== null) {
                    var cursor = element.cursor(eventData);
                    if (cursor){
                        Cursor.setCursor(cursor);
                        return;
                    }
                    if (element.canSelect() && element.canDrag() && !element.locked() && Selection.isElementSelected(element)){
                        Cursor.setCursor(Keyboard.state.alt ? "move_clone" : "move_cursor");
                        return;
                    }
                }
            }
        }

        Cursor.setCursor(Selection.directSelectionEnabled() ? "direct_select_cursor" : "default_cursor");
    }

    _bubbleMouseEvent(eventData, method) {
        for (var i = 0; i < this.view._layersReverse.length; i++) {
            var layer = this.view._layersReverse[i];
            var e = layer.hitElement(eventData, this.view.scale());
            if (e && e[method] /*&& e.canSelect()*/ && !e.locked()) {
                e[method](eventData);
                if (eventData.handled) {
                    return false;
                }
            }
        }
    }

    createEventData(event) {
        updateEvent.call(this, event);
        return {
            handled: false,
            x: domUtil.layerX(event),
            y: domUtil.layerY(event),
            event: event,
            ctrlKey: event._ctrlKey,
            altKey: event.altKey,
            shiftKey: event.shiftKey,
            view: this
        }
    }


    constructor(app, view, deps) {
        this.app = app;
        this.view = view;
        this.deps = deps;
        this._draggingElement = null;
        this._draggingOverElement = null;
        this._startDraggingData = null; // delayed dragging data
        this._noActionsBeforeClick = false;
        this.touchHelper = new TouchHelper(view);

        this.draggingEvent = EventHelper.createEvent();
        this.draggingEnterEvent = EventHelper.createEvent();
        this.draggingLeftEvent = EventHelper.createEvent();
        this.stopDraggingEvent = EventHelper.createEvent();
        this.startDraggingEvent = EventHelper.createEvent();
        this.startResizingEvent = EventHelper.createEvent();
        this.resizingEvent = EventHelper.createEvent();
        this.stopResizingEvent = EventHelper.createEvent();
        this.startRotatingEvent = EventHelper.createEvent();
        this.rotatingEvent = EventHelper.createEvent();
        this.stopRotatingEvent = EventHelper.createEvent();
        this.mousemoveEvent = EventHelper.createEvent();
        this.mousedownEvent = EventHelper.createEvent();
        this.mouseupEvent = EventHelper.createEvent();
        this.dblclickEvent = EventHelper.createEvent();
        this.clickEvent = EventHelper.createEvent();


        this.mouseenterEvent = EventHelper.createEvent();
        this.mouseleaveEvent = EventHelper.createEvent();


        this.onElementClicked = EventHelper.createEvent();
        this.onElementDblClicked = EventHelper.createEvent();
        this.onArtboardChanged = EventHelper.createEvent();
        this.inlineEditModeChanged = EventHelper.createEvent();
        this.inlineEditModeChanged.bind(this, this.onInlineEditModeChanged);
        //TODO: dispose?

        this._cancelBinding = actionManager.subscribe('cancel', this.cancel.bind(this));
        RepeatViewListener.ensureSubscribed(this);

        Keyboard.changed.bind(this, this._onKeyChanged);
        Selection.directSelectionChangedEvent.bind(() => this._updateCursor());

        this.actionManager = actionManager;
    }

    onpanstart(event) {
        this.touchHelper.onpanstart(event);
    }

    onpanmove(event) {
        this.touchHelper.onpanmove(event);
    }

    onpanend(event) {
        this.touchHelper.onpanend(event);
    }

    onpinchmove(event) {
        this.touchHelper.onpinchmove(event);
    }

    onpinchstart(event) {
        this.touchHelper.onpinchstart(event);
    }

    onpinchend(event) {
        this.touchHelper.onpinchend(event);
    }


    beginDrag(event) {
        var eventData = {
            mouseX: event.x,
            mouseY: event.y,
            x: event.x,
            y: event.y
        };

        this._draggingElement = new ObjectFactory.construct(Types.DraggingElement, event);
        this._draggingElement.showOriginal(event.altKey);

        this.view.layer3.add(this._draggingElement);
        this._draggingOffset = {
            x: event.x - this._draggingElement.x(),
            y: event.y - this._draggingElement.y()
        };

        this.startDraggingEvent.raise(eventData);
        this._draggingOverElement = null;
    }


    onmousedown(eventData) {
        this._noActionsBeforeClick = true;

        this.mousedownEvent.raise(eventData);
        if (eventData.handled) {
            return;
        }

        if (this._captureElement != null) {
            this._captureElement.mousedown(eventData);
            return;
        }

        this._mouseDownData = eventData;

        this._bubbleMouseEvent(eventData, "mousedown");

        // apply default behavior
        if (!eventData.handled) {
            var composite = Selection.selectComposite();
            // first check current selection
            if(composite && composite.hitTest(eventData, this.view.scale())) {
                eventData.elements = composite.elements;
                if (composite.canDrag()) {
                    this._startDraggingData = eventData;
                    eventData.handled = true;
                } else if (composite.canSelect() && !composite.locked()) {
                    eventData.handled = true;
                }
            }
            else {
                for (var i = 0; i < this.view._layersReverse.length ; i++) {
                    var layer = this.view._layersReverse[i];
                    var element = layer.hitElement(eventData, this.view.scale(), null, eventData.event.ctrlKey);
                    if (element !== null) {
                        eventData.elements = [element];
                        if (element.canDrag()) {
                            this._startDraggingData = eventData;
                            eventData.handled = true;
                        } else if (element.canSelect() && !element.locked()) {
                            eventData.handled = true;
                        }

                        break;
                    }
                }
            }

            this._bubbleMouseEvent(eventData, "mousedown");

            if (!eventData.handled) {
                Selection.setupSelectFrame(new this.deps.SelectFrame(EventHandler(this, onselect)), eventData);

                this.view.layer3.add(Selection.selectFrame);
            }
        }
    }

    onmousemove(eventData) {
        eventData.isDragging = this._draggingElement !== null;
        if (this._mouseDownData) {
            if (eventData.x === this._mouseDownData.x && eventData.y === this._mouseDownData.y) {
                return;
            }
            delete this._mouseDownData;
        }

        this.mousemoveEvent.raise(eventData);
        if (eventData.handled) {
            this._noActionsBeforeClick = false;
            return;
        }

        if (this._captureElement != null) {
            this._captureElement.mousemove(eventData);
            this._noActionsBeforeClick = false;
            return;
        }

        // if (!eventData.handled) {
        //     Selection.directSelectionEnabled(eventData.event.ctrlKey);
        //     var element = this.app.activePage.hitElement(eventData, this.view.scale());
        //     Selection.directSelectionEnabled(false);
        //     if (element != this._mouseOverElement) {
        //         if (this._mouseOverElement) {
        //             this._mouseOverElement.mouseLeaveElement(eventData);
        //         }
        //         this._mouseOverElement = element;
        //         if (element) {
        //             element.mouseEnterElement(eventData);
        //         }
        //     }
        // }

        this._noActionsBeforeClick = false;

        // this is needed for delayed dragging (not create dragging element before we move mouse)
        if (this._startDraggingData) {
            this.beginDrag(this._startDraggingData);
            this._startDraggingData = null;
        }

        if (Selection.selectFrame !== null) {
            Selection.updateSelectFrame(eventData);

            Invalidate.requestUpperOnly();
            return;
        }

        if (this._draggingElement != null) {
            dragging.call(this, {
                x: (eventData.x - this._draggingOffset.x),
                y: (eventData.y - this._draggingOffset.y),
                mouseX: eventData.x,
                mouseY: eventData.y,
                altKey: eventData.altKey,
                shiftKey: eventData.shiftKey,
                ctrlKey: eventData.ctrlKey
            });

            return;
        }

        this._updateCursor(eventData);
        this._bubbleMouseEvent(eventData, "mousemove");
    }

    onmouseenter(eventData) {
        this.mouseenterEvent.raise(eventData);

        this._bubbleMouseEvent(eventData, "mouseenter");
    }

    onmouseleave(eventData) {
        this.mouseleaveEvent.raise(eventData);

        this._bubbleMouseEvent(eventData, "mouseleave");
    }

    onmouseup(eventData) {
        eventData.element = this._draggingElement;

        this.mouseupEvent.raise(eventData);
        if (eventData.handled) {
            return;
        }

        this._startDraggingData = null;

        if (this._captureElement != null) {
            this._captureElement.mouseup(eventData);
            return;
        }

        delete this._mouseDownData;

        if (Selection.selectFrame !== null) {

            this.view.layer3.remove(Selection.selectFrame);
            Selection.completeSelectFrame(eventData);

            return;
        }

        this._bubbleMouseEvent(eventData, "mouseup");
        if (eventData.handled) {
            return;
        }

        if (this._draggingElement !== null) {
            stopDrag.call(this, eventData);
            this._draggingElement = null;
            return;
        }
    }

    ondblclick(eventData) {
        this.dblclickEvent.raise(eventData);
        if (eventData.handled) {
            return;
        }

        if (this._captureElement != null) {
            this._captureElement.dblclick(eventData);
            return;
        }

        this._bubbleMouseEvent(eventData, "dblclick");

        if (!eventData.handled) {
            var element = this.app.activePage.hitElement(eventData, this.view.scale());
            if (element !== null) {
                eventData.element = element;
                this.onElementDblClicked.raise(eventData);
            }
        }
    }

    onclick(eventData) {
        if (this._noActionsBeforeClick) {

            this.clickEvent.raise(eventData);
            if (eventData.handled) {
                return;
            }

            if (this._captureElement != null) {
                this._captureElement.click(eventData);
                return;
            }

            if (!eventData.handled) {
                this._bubbleMouseEvent(eventData, "click");
            }

            if (!eventData.handled) {
                this.selectByClick(eventData);
            }
        }
    }

    _onKeyChanged(newKeys, oldKeys){
        Selection.directSelectionEnabled(newKeys.ctrl);

        if (oldKeys.alt !== newKeys.alt){
            var c = Cursor.getCursor();
            if (newKeys.alt && c === "move_cursor"){
                Cursor.setCursor("move_clone");
            }
            else if (!newKeys.alt && c === "move_clone"){
                Cursor.setCursor("move_cursor");
            }

            if (this._draggingElement){
                this._draggingElement.showOriginal(newKeys.alt);
                Invalidate.request();
            }
        }
    }

    selectByClick(eventData) {
        var element = this.app.activePage.hitElement(eventData, this.view.scale(), null, eventData.ctrlKey);

        if (element !== null) {
            eventData.element = element;
            this.onElementClicked.raise(eventData);
            if (eventData.handled) {
                return;
            }

            if (element.canSelect() && !element.locked()) {
                var addToSelection = eventData.shiftKey;
                if (addToSelection) {
                    Selection.selectionMode("add");
                }
                Selection.makeSelection([element]);
                if (addToSelection) {
                    Selection.selectionMode("new");
                }

                Cursor.setCursor("move_cursor");
            }
        }

        return element;
    }

    onscroll(event) {
        this.view.scrollX(this.view.scrollX() + event.event.deltaX);
        this.view.scrollY(this.view.scrollY() + event.event.deltaY);
        Invalidate.request();
    }


    beginDragElement(event, element, stopDragPromise) {
        var eventData = this.createEventData(event);
        eventData.element = element;
        element.position({x: ~~(eventData.x - element.width() / 2), y: ~~(eventData.y - element.height() / 2)});
        this.beginDrag(eventData);
        stopDragPromise
            .then(e => {
                this.onmouseup(this.createEventData(e));
            })
            .catch(e => {
                this.cancel();
                this.stopDraggingEvent.raise(this.createEventData(e), null);
            });
    }


    captureMouse(/*UIElement*/element) {
        this._captureElement = element;
    }

    releaseMouse() {
        this._captureElement = null;
    }

    showContextMenu(eventData) {
        var element = this.app.activePage.hitElement(eventData, this.view.scale(), null, eventData.ctrlKey);

        if (element !== null && !Selection.isElementSelected(element)) {
            eventData.element = element;
            eventData.event = event;
            this.onElementClicked.raise(eventData);
            if (eventData.handled) {
                return;
            }

            if (element.canSelect()) {
                Selection.makeSelection([element]);
            }
        }
    }

    onInlineEditModeChanged(mode, editor){
        this.isInlineEditMode = mode;
        this.inlineEditor = editor;
    }

    cancel() {
        if (this._draggingElement) {
            this._draggingElement.detach();
            this._draggingElement = null;
        }
    }

}