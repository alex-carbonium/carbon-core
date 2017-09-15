import { areRectsIntersecting } from "math/math";
import EventHelper from "./EventHelper";
import Selection from "./SelectionModel";
import CompositeElement from "./CompositeElement";
import domUtil from "utils/dom";
import Cursor from "./Cursor";
import Invalidate from "./Invalidate";
import TouchHelper from "./TouchHelper";
import Artboard from "./Artboard";
import Page from "./Page";
import Keyboard from "../platform/Keyboard";
import ObjectFactory from "./ObjectFactory";
import { Types, ViewTool } from "./Defs";
import { IApp, IController, IEvent, IEvent2, IMouseEventData, KeyboardState, IUIElement, IContainer, IComposite, IEvent3 } from "carbon-core";
import UIElement from "./UIElement";
import Container from "./Container";
import { choosePasteLocation } from "./PasteLocator";
import { IArtboard } from "carbon-model";
import Point from "../math/point";
import { IDropElementData } from "carbon-app";
import Cursors from "Cursors";
import PropertyTracker from "./PropertyTracker";
import { DraggingElement } from "./interactions/DraggingElement";

export default class DesignerController implements IController {
    [name: string]: any;
    app: IApp;
    actionManager: any;

    onArtboardChanged: IEvent2<IArtboard, IArtboard>;

    startDrawingEvent: IEvent<any>;
    interactionActive: boolean;
    clickEvent: IEvent<IMouseEventData>;
    dblclickEvent: IEvent<IMouseEventData>;
    mousedownEvent: IEvent<IMouseEventData>;
    mousemoveEvent: IEvent<IMouseEventData>;
    mouseupEvent: IEvent<IMouseEventData>;

    onElementDblClicked: IEvent2<IMouseEventData, IUIElement>;

    startDraggingEvent: IEvent2<IMouseEventData, IComposite>;
    draggingEvent: IEvent3<IMouseEventData, IComposite, IContainer>;
    stopDraggingEvent: IEvent2<IMouseEventData, IComposite>;

    startResizingEvent: IEvent2<IMouseEventData, IUIElement>;
    resizingEvent: IEvent2<IMouseEventData, IUIElement>;
    stopResizingEvent: IEvent2<IMouseEventData, IUIElement>;

    startRotatingEvent: IEvent2<IMouseEventData, IUIElement>;
    rotatingEvent: IEvent2<IMouseEventData, IUIElement>;
    stopRotatingEvent: IEvent2<IMouseEventData, IUIElement>;

    inlineEditModeChanged: IEvent2<boolean, any>;

    _lastMouseMove: IMouseEventData = null;
    _startDraggingData: any;
    _startDraggingElement: IUIElement;
    _draggingElement: DraggingElement = null;
    _draggingOverElement: Container = null;

    updateCursor(eventData?) {
        if (eventData) {
            if (eventData.cursor) {
                Cursor.setCursor(eventData.cursor);
                return;
            }

            if (Cursor.hasGlobalCursor()) {
                return;
            }

            var composite = Selection.selectComposite();
            if (composite.canDrag() && composite.hitTest(eventData, this.view.scale())) {
                Cursor.setCursor(Keyboard.state.altKey ? "move_clone" : "move_cursor");
                return;
            }

            for (var i = this.view._layers.length - 1; i >= 0; i--) {
                var layer = this.view._layers[i];
                var element = layer.hitElement(eventData, this.view.scale());
                if (element !== null) {
                    var cursor = element.cursor(eventData);
                    if (cursor) {
                        Cursor.setCursor(cursor);
                        return;
                    }
                    if (element.canSelect() && element.canDrag() && !element.locked() && Selection.isElementSelected(element)) {
                        this._setMoveCursor();
                        return;
                    }
                }
            }
        }

        if (!Cursor.hasGlobalCursor()) {
            Cursor.setCursor(this.defaultCursor());
        }
    }
    defaultCursor(): string {
        return Selection.directSelectionEnabled() ? "direct_select_cursor" : "default_cursor"
    }

    onWindowResize() {

    }

    ondoubletap() {

    }

    _setMoveCursor() {
        Cursor.setCursor(Keyboard.state.altKey ? "move_clone" : "move_cursor");
    }

    _bubbleMouseEvent(eventData, method) {
        for (var i = this.view._layers.length - 1; i >= 0; i--) {
            var layer = this.view._layers[i];
            var e = layer.hitElement(eventData, this.view.scale());
            if (e && e[method] /*&& e.canSelect()*/ && !e.locked()) {
                e[method](eventData, Keyboard.state);
                if (eventData.handled) {
                    return false;
                }
            }
        }
    }

    createEventData(event: MouseEvent): IMouseEventData {
        var scale = this.view.scale();

        return {
            handled: false,
            x: Math.round((domUtil.layerX(event) + this.view.scrollX()) * 100 / scale) / 100,
            y: Math.round((domUtil.layerY(event) + this.view.scrollY()) * 100 / scale) / 100,
            event: event,
            ctrlKey: event.ctrlKey || event.metaKey,
            altKey: event.altKey,
            shiftKey: event.shiftKey
        };
    }


    constructor(app, view) {
        this.app = app;
        this.view = view;
        this._draggingElement = null;
        this._draggingOverElement = null;
        this._startDraggingData = null; // delayed dragging data
        this._startDraggingElement = null;
        this._noActionsBeforeClick = false;
        this.touchHelper = new TouchHelper(view);

        this.stopDraggingEvent = EventHelper.createEvent2<IMouseEventData, IComposite>();
        this.startDraggingEvent = EventHelper.createEvent2<IMouseEventData, IComposite>();
        this.draggingEvent = EventHelper.createEvent3<IMouseEventData, IComposite, IContainer>();
        this.draggingEnterEvent = EventHelper.createEvent();
        this.draggingLeftEvent = EventHelper.createEvent();
        this.startResizingEvent = EventHelper.createEvent2<IMouseEventData, IUIElement>();
        this.resizingEvent = EventHelper.createEvent2<IMouseEventData, IUIElement>();
        this.stopResizingEvent = EventHelper.createEvent2<IMouseEventData, IUIElement>();
        this.startRotatingEvent = EventHelper.createEvent2<IMouseEventData, IUIElement>();
        this.rotatingEvent = EventHelper.createEvent2<IMouseEventData, IUIElement>();
        this.stopRotatingEvent = EventHelper.createEvent2<IMouseEventData, IUIElement>();
        this.mousemoveEvent = EventHelper.createEvent<IMouseEventData>();
        this.mousedownEvent = EventHelper.createEvent<IMouseEventData>();
        this.mouseupEvent = EventHelper.createEvent<IMouseEventData>();
        this.dblclickEvent = EventHelper.createEvent<IMouseEventData>();
        this.clickEvent = EventHelper.createEvent<IMouseEventData>();


        this.mouseenterEvent = EventHelper.createEvent();
        this.mouseleaveEvent = EventHelper.createEvent();


        this.onElementClicked = EventHelper.createEvent();
        this.onElementDblClicked = EventHelper.createEvent2<IMouseEventData, IUIElement>();
        this.onArtboardChanged = EventHelper.createEvent2<IArtboard, IArtboard>();
        this.inlineEditModeChanged = EventHelper.createEvent2<boolean, any>();
        this.inlineEditModeChanged.bind(this, this.onInlineEditModeChanged);
        //TODO: dispose?

        this.startDrawingEvent = EventHelper.createEvent();

        this._cancelBinding = this.app.actionManager.subscribe('cancel', this.cancel.bind(this));

        Keyboard.changed.bind(this, this._onKeyChanged);
        Selection.modeChangedEvent.bind(this, this._onSelectionModeChanged);
        Selection.selectFrame.onComplete.bind(this, this.onSelectedWithFrame);

        this.actionManager = this.app.actionManager;

        this.interactionActive = false;
        this.startDraggingEvent.bind(this, this.onInteractionStarted);
        this.startRotatingEvent.bind(this, this.onInteractionStarted);
        this.startResizingEvent.bind(this, this.onInteractionStarted);

        this.stopDraggingEvent.bind(this, this.onInteractionStopped);
        this.stopRotatingEvent.bind(this, this.onInteractionStopped);
        this.stopResizingEvent.bind(this, this.onInteractionStopped);
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


    beginDrag(event: IMouseEventData, element: IUIElement, hideFrame: boolean = true) {
        if (hideFrame) {
            Selection.hideFrame();
        }

        this._draggingElement = new DraggingElement(element, event);

        this.view.interactionLayer.add(this._draggingElement);

        this.startDraggingEvent.raise(event, this._draggingElement);
        this._draggingOverElement = null;
    }

    dragging(event: IMouseEventData) {
        if (this._draggingElement.allowMoveOutChildren(event)) {
            this.handleDraggingOver(event);
        }

        this._draggingElement.dragTo(event);

        this.draggingEvent.raise(event, this._draggingElement, this._draggingOverElement);
    }

    handleDraggingOver(eventData: IMouseEventData) {
        var scale = this.view.scale();
        var dragOverElement = null;

        var element = this.view.hitElementDirect(eventData, (element: UIElement, position, scale) => {
            var descendantOrSelf = this._draggingElement.elements.some(x => element.isDescendantOrSame(x));
            if (!descendantOrSelf && element.hitTest(position, scale, true)) {
                return true;
            }

            return false;
        });

        while (element !== null) {
            if (element.canAccept(this._draggingElement.elements, undefined, eventData.ctrlKey)) {
                dragOverElement = element;
                break;
            }
            element = element.parent();
        }

        if (this._draggingOverElement !== null && this._draggingOverElement !== dragOverElement) {
            //this._draggingOverElement.draggingLeft(eventData);
            this.draggingLeftEvent.raise(eventData);
            this._draggingOverElement = null;
        }

        if (dragOverElement !== this._draggingOverElement) {
            this._draggingOverElement = dragOverElement;
            // if (this._draggingOverElement) {
            //     this._draggingOverElement.draggingEnter(eventData);
            // }
            this.draggingEnterEvent.raise(eventData);
        }
    }

    stopDrag(event) {
        if (!this._draggingOverElement) {
            this._draggingElement.detach();
            this.stopDraggingEvent.raise(event, null);
            //active frame could have been hidden, show it again now
            Selection.refreshSelection();
            return false;
        }

        var elements = this._draggingElement.stopDragging(event, this._draggingOverElement, this.app.activePage);

        this.stopDraggingEvent.raise(event, this._draggingElement);
        this._draggingElement.detach();
    }

    isDragging() {
        return this._draggingElement !== null;
    }

    onmousedown(eventData) {
        this._noActionsBeforeClick = true;
        this._mouseDownData = eventData;

        this.mousedownEvent.raise(eventData);
        if (eventData.handled) {
            if (eventData.cursor) {
                this.updateCursor(eventData);
            }
            return;
        }

        if (this._captureElement) {
            this._captureElement.mousedown(eventData);
            if (eventData.cursor) {
                this.updateCursor(eventData);
            }
            return;
        }

        this._lastMouseMove = null;

        this._bubbleMouseEvent(eventData, "mousedown");
        if (eventData.cursor) {
            this.updateCursor(eventData);
        }

        // apply default behavior
        if (!eventData.handled) {
            var composite = Selection.selectComposite();
            // first check current selection
            if (composite && composite.hitTest(eventData, this.view.scale())) {
                if (composite.canDrag()) {
                    this._startDraggingData = eventData;
                    this._startDraggingElement = composite;
                    eventData.handled = true;
                } else if (composite.canSelect() && !composite.locked()) {
                    eventData.handled = true;
                }
            }
            else {
                for (var i = this.view._layers.length - 1; i >= 0; i--) {
                    var layer = this.view._layers[i];
                    var element = layer.hitElement(eventData, this.view.scale(), null, Selection.directSelectionEnabled());
                    if (element !== null) {
                        if (element.canDrag()) {
                            this._startDraggingData = eventData;
                            this._startDraggingElement = element;
                            this._setMoveCursor();
                            eventData.handled = true;
                        } else if (element.canSelect() && !element.locked()) {
                            eventData.handled = true;
                        }

                        break;
                    }
                }
            }

            if (!eventData.handled) {
                Selection.startSelectFrame(eventData);

                this.view.interactionLayer.add(Selection.selectFrame);
            }
        }
    }

    onmousemove(eventData: IMouseEventData) {
        if (!this._lastMouseMove && this._mouseDownData &&
            this._mouseDownData.x === eventData.x &&
            this._mouseDownData.y === eventData.y) {
            return; // do not realy rise mouse move if not movent after mouse down happened (bug on my laptop :) )
        }

        if (this._lastMouseMove) {
            this._lastMouseMove.x = eventData.x;
            this._lastMouseMove.y = eventData.y;
            this._lastMouseMove.handled = false;
            this._lastMouseMove.cursor = null;
            this._lastMouseMove.altKey = eventData.altKey;
            this._lastMouseMove.shiftKey = eventData.shiftKey;
            this._lastMouseMove.ctrlKey = eventData.ctrlKey;
        }
        else {
            this._lastMouseMove = {
                x: eventData.x,
                y: eventData.y,
                handled: false,
                cursor: null,
                altKey: eventData.altKey,
                ctrlKey: eventData.ctrlKey,
                shiftKey: eventData.shiftKey
            };
        }

        if (this._mouseDownData) {
            if (eventData.x === this._mouseDownData.x && eventData.y === this._mouseDownData.y) {
                return;
            }
            delete this._mouseDownData;
        }

        this.mousemoveEvent.raise(eventData);
        if (eventData.handled) {
            this._noActionsBeforeClick = false;
            this.updateCursor(eventData);
            return;
        }

        if (this._captureElement) {
            this._captureElement.mousemove(eventData);
            this.updateCursor(eventData);
            this._noActionsBeforeClick = false;
            return;
        }

        // if (!eventData.handled) {
        //     Selection.directSelectionEnabled(eventData.ctrlKey);
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
            this.beginDrag(this._startDraggingData, this._startDraggingElement);
            this._startDraggingData = null;
            this._startDraggingElement = null;
        }

        if (Selection.hasSelectionFrame()) {
            Selection.updateSelectFrame(eventData);

            Invalidate.requestInteractionOnly();
            return;
        }

        if (this._draggingElement) {
            this.dragging(eventData);
            return;
        }

        this._bubbleMouseEvent(eventData, "mousemove");
        this.updateCursor(eventData);
    }

    repeatLastMouseMove(keys: KeyboardState = Keyboard.state) {
        if (this._lastMouseMove) {
            this._lastMouseMove.altKey = keys.altKey;
            this._lastMouseMove.ctrlKey = keys.ctrlKey;
            this._lastMouseMove.shiftKey = keys.shiftKey;
            this.onmousemove(this._lastMouseMove);
        }
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
        eventData.transformationElement = this._draggingElement;

        this.mouseupEvent.raise(eventData);
        if (eventData.handled) {
            if (eventData.cursor) {
                this.updateCursor(eventData);
            }
            return;
        }

        this._startDraggingData = null;
        this._startDraggingElement = null;

        if (this._captureElement) {
            this._captureElement.mouseup(eventData);
            if (eventData.cursor) {
                this.updateCursor(eventData);
            }
            return;
        }

        delete this._mouseDownData;

        if (Selection.hasSelectionFrame()) {

            this.view.interactionLayer.remove(Selection.selectFrame);
            Selection.completeSelectFrame(eventData);

            return;
        }

        this._bubbleMouseEvent(eventData, "mouseup");
        if (eventData.cursor) {
            this.updateCursor(eventData);
        }
        if (eventData.handled) {
            return;
        }

        if (this._draggingElement !== null) {
            this.stopDrag(eventData);
            this._draggingElement = null;
            return;
        }
    }

    ondblclick(eventData) {
        this.dblclickEvent.raise(eventData);
        if (eventData.handled) {
            return;
        }

        if (this._captureElement) {
            this._captureElement.dblclick(eventData, this.view.scale());
            return;
        }

        this._bubbleMouseEvent(eventData, "dblclick");

        if (!eventData.handled) {
            var element = this.view.hitElement(eventData);
            if (element !== null) {
                eventData.element = element;
                this.onElementDblClicked.raise(eventData, element);
            }
        }
    }

    onclick(eventData) {
        if (this._noActionsBeforeClick) {

            this.clickEvent.raise(eventData);
            if (eventData.handled) {
                if (eventData.cursor) {
                    this.updateCursor(eventData);
                }
                return;
            }

            if (this._captureElement) {
                this._captureElement.click(eventData);
                if (eventData.cursor) {
                    this.updateCursor(eventData);
                }
                return;
            }

            if (!eventData.handled) {
                this._bubbleMouseEvent(eventData, "click");
            }

            if (!eventData.handled) {
                this.selectByClick(eventData);
            }
            if (eventData.cursor) {
                this.updateCursor(eventData);
            }
        }
    }

    _onKeyChanged(newKeys: KeyboardState, oldKeys: KeyboardState) {
        if ((this.app.currentTool === ViewTool.Pointer || this.app.currentTool === ViewTool.PointerDirect) && !this.interactionActive) {
            Selection.directSelectionEnabled(newKeys.ctrlKey);
        }

        if (oldKeys.altKey !== newKeys.altKey) {
            var c = Cursor.getCursor();
            if (newKeys.altKey && c === "move_cursor") {
                Cursor.setCursor("move_clone");
            }
            else if (!newKeys.altKey && c === "move_clone") {
                Cursor.setCursor("move_cursor");
            }

            if (this._draggingElement) {
                this._draggingElement.altChanged(newKeys.altKey);
                Invalidate.request();
            }
        }

        this.repeatLastMouseMove(newKeys);
    }
    _onSelectionModeChanged() {
        var cursor = Cursor.getCursor();
        if (cursor === "default_cursor" || cursor === "direct_select_cursor") {
            this.updateCursor();
        }
    }

    selectByClick(eventData) {
        var element = this.view.hitElement(eventData) as IUIElement;

        if (element !== null) {
            eventData.element = element;
            this.onElementClicked.raise(eventData);
            if (eventData.handled) {
                return null;
            }

            if (element.canSelect() && !element.locked()) {
                let mode = Selection.getSelectionMode(eventData, false);
                Selection.makeSelection([element], mode);

                if (element.primitiveRoot().isEditable()) {
                    eventData.cursor = Cursors.Move;
                }
            }
            else {
                element = null;
            }
        }

        if (element === null) {
            Selection.makeSelection([]);
        }

        return element;
    }

    private onSelectedWithFrame(rect, keys: KeyboardState) {
        let mode = Selection.getSelectionMode(keys, true);

        for (var i = this.view._layers.length - 1; i >= 0; --i) {
            var layer = this.view._layers[i];
            if (!layer.hitTransparent()) {
                var selection = layer.getElementsInRect(rect);
                if (selection) {
                    Selection.makeSelection(selection, mode);
                }
                return;
            }
        }

        if (mode === "new") {
            Selection.clearSelection();
        }
    }

    onscroll(event) {
        this.view.scrollX(this.view.scrollX() + event.event.deltaX);
        this.view.scrollY(this.view.scrollY() + event.event.deltaY);
        Invalidate.request();
    }


    beginDragElement(event: MouseEvent, element: IUIElement, stopDragPromise: Promise<IDropElementData>) {
        var eventData = this.createEventData(event);
        element.resetTransform();
        element.applyTranslation(new Point(Math.round(eventData.x - element.width() / 2), Math.round(eventData.y - element.height() / 2)));
        this._startDraggingElement = element;
        this.beginDrag(eventData, element, false);

        Cursor.setCursor("move_cursor");

        stopDragPromise
            .then(result => {
                var eventData = this.createEventData(result.e);
                var parent = this.getCurrentDropTarget(eventData);
                var br = element.boundaryRect();

                this.stopDraggingEvent.raise(eventData, this._draggingElement);

                this.cancel();
                this.insertAndSelect(result.elements, parent, eventData.x - br.width / 2, eventData.y - br.height / 2);
            })
            .catch(e => {
                this.cancel();
                this.stopDraggingEvent.raise(null, null);
            });
    }

    insertAndSelect(elements: IUIElement[], parent: IContainer | IComposite, x: number, y: number) {
        var newSelection: UIElement[] = [];

        for (let i = 0; i < elements.length; i++) {
            let element = elements[i];

            if (parent instanceof CompositeElement) {
                for (let k = 0; k < parent.elements.length; ++k) {
                    var toInsert = k === 0 ? element : element.clone();
                    newSelection.push(parent.elements[k].add(toInsert));
                }
            }
            else {
                let container = parent as Container;
                if (!container.autoPositionChildren()) {
                    let newMatrix = element.viewMatrix().withTranslation(Math.round(x), Math.round(y));
                    element.setTransform(container.globalMatrixToLocal(newMatrix));
                }
                newSelection.push(container.add(element));
            }
        }

        for (let i = 0; i < newSelection.length; ++i){
            newSelection[i].clearSavedLayoutProps();
        }

        Selection.makeSelection(newSelection);
    }

    getCurrentDropTarget(eventData: IMouseEventData): IContainer | IComposite | null {
        var parent = this._draggingOverElement;
        var selectComposite = Selection.selectComposite();
        if (selectComposite.canAccept([this._startDraggingElement], undefined, eventData.ctrlKey)
            && selectComposite.hitTest(eventData, this.view.scale(), true)
        ) {
            return Selection.selectComposite();
        }
        return parent;
    }

    captureMouse(/*UIElement*/element) {
        this._captureElement = element;
    }

    releaseMouse() {
        this._captureElement = null;
    }

    showContextMenu(eventData) {
        var element = this.view.hitElement(eventData);

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

    onInlineEditModeChanged(mode, editor) {
        this.isInlineEditMode = mode;
        this.inlineEditor = editor;
    }

    cancel() {
        if (this._draggingElement) {
            this._draggingElement.detach();
            this._draggingElement = null;
        }
    }

    onInteractionStarted() {
        PropertyTracker.suspend();
        this.interactionActive = true;
    }
    onInteractionStopped() {
        PropertyTracker.resumeAndFlush();
        this.interactionActive = false;
    }

    choosePasteLocation(elements: IUIElement[], allowMoveIn?: boolean) {
        return choosePasteLocation(elements, null, allowMoveIn);
    }
}