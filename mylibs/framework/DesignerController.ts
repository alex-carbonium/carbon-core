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
import Phantom from "./Phantom";
import ObjectFactory from "./ObjectFactory";
import { Types, ViewTool } from "./Defs";
import { IApp, IController, IEvent, IEvent2, IMouseEventData, IKeyboardState, IUIElement, IContainer, IElementEventData, ITransformationEventData } from "carbon-core";
import UIElement from "./UIElement";
import Container from "./Container";
import { choosePasteLocation } from "./PasteLocator";
import { IArtboard } from "carbon-model";
import Point from "../math/point";
import { IDropElementData } from "carbon-app";
import Cursors from "Cursors";

function onselect(rect) {
    for (var i = this.view._layers.length - 1; i >= 0; --i) {
        var layer = this.view._layers[i];
        if (!layer.hitTransparent()) {
            var selection = layer.getElementsInRect(rect);
            if (selection) {
                Selection.makeSelection(selection);
            }
            return;
        }
    }

    Selection.makeSelection([]);
}

function stopDrag(event) {
    if (!this._draggingElement.isDropSupported()) {
        this._draggingElement.detach();
        this.stopDraggingEvent.raise(event, null);
        //active frame could have been hidden, show it again now
        Selection.refreshSelection();
        return false;
    }

    var elements = this._draggingElement.stopDragging(event, this._draggingOverElement, this.app.activePage);
    this._draggingElement.detach();

    if (elements.length === 1) {
        if (elements[0].props._unwrapContent) {
            elements = elements[0].unwrapToParent();
        }
    }

    this.stopDraggingEvent.raise(event, elements);

    //could start dragging not selected object
    Selection.makeSelection(elements);
}

function _handleDraggingOver(mousePoint, draggingElement, eventData) {
    var scale = this.view.scale();
    var dragOverElement = null;

    var element = this.view.hitElementDirect(mousePoint, function (element: UIElement, position, scale) {
        var descendantOrSelf = draggingElement.elements.some(x => element.isDescendantOrSame(x));
        if (!descendantOrSelf && element.hitTest(position, scale, true)) {
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

function dragging(event, keys: IKeyboardState) {
    var draggingElement = this._draggingElement;
    var eventData = {
        handled: false,
        draggingElement: this._draggingElement,
        transformationElement: this._draggingElement,
        x: event.x,
        y: event.y,
        mouseX: event.mouseX,
        mouseY: event.mouseY,
        target: this._draggingOverElement,
        event: event
    };

    var mousePoint = { x: eventData.mouseX, y: eventData.mouseY };

    if (this._draggingElement.allowMoveOutChildren(event)) {
        _handleDraggingOver.call(this, mousePoint, draggingElement, eventData);
    }

    this._draggingElement.dragTo(eventData);

    this.draggingEvent.raise(eventData, keys);
}

export default class DesignerController implements IController {
    [name: string]: any;
    app: IApp;
    actionManager: any;

    onArtboardChanged: IEvent2<IArtboard, IArtboard>;

    startDrawingEvent: IEvent<any>;
    interactionActive: boolean;
    clickEvent: IEvent2<IMouseEventData, IKeyboardState>;
    dblclickEvent: IEvent2<IMouseEventData, IKeyboardState>;
    mousedownEvent: IEvent2<IMouseEventData, IKeyboardState>;
    mousemoveEvent: IEvent2<IMouseEventData, IKeyboardState>;
    mouseupEvent: IEvent2<IMouseEventData, IKeyboardState>;

    onElementDblClicked: IEvent2<IElementEventData, IKeyboardState>;

    startDraggingEvent: IEvent2<IMouseEventData, IKeyboardState>;
    draggingEvent: IEvent<ITransformationEventData>;
    stopDraggingEvent: IEvent2<IMouseEventData, IKeyboardState>;

    startResizingEvent: IEvent<ITransformationEventData>;
    resizingEvent: IEvent<ITransformationEventData>;
    stopResizingEvent: IEvent<ITransformationEventData>;

    startRotatingEvent: IEvent<ITransformationEventData>;
    rotatingEvent: IEvent<ITransformationEventData>;
    stopRotatingEvent: IEvent<ITransformationEventData>;

    inlineEditModeChanged: IEvent2<boolean, any>;

    _lastMouseMove: IMouseEventData;
    _startDraggingData: any;
    _startDraggingElement: IUIElement;

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
                Cursor.setCursor(Keyboard.state.alt ? "move_clone" : "move_cursor");
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
        Cursor.setCursor(Keyboard.state.alt ? "move_clone" : "move_cursor");
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

    createEventData(event): IMouseEventData {
        var scale = this.view.scale();

        event._ctrlKey = event.ctrlKey || event.metaKey;
        event._scale = scale;

        return {
            handled: false,
            x: Math.round((domUtil.layerX(event) + this.view.scrollX()) * 100 / scale) / 100,
            y: Math.round((domUtil.layerY(event) + this.view.scrollY()) * 100 / scale) / 100,
            event: event,
            ctrlKey: event._ctrlKey,
            altKey: event.altKey,
            shiftKey: event.shiftKey,
            view: this
        } as any;
    }


    constructor(app, view, deps) {
        this.app = app;
        this.view = view;
        this.deps = deps;
        this._draggingElement = null;
        this._draggingOverElement = null;
        this._startDraggingData = null; // delayed dragging data
        this._startDraggingElement = null;
        this._noActionsBeforeClick = false;
        this.touchHelper = new TouchHelper(view);

        this.draggingEvent = EventHelper.createEvent();
        this.draggingEnterEvent = EventHelper.createEvent();
        this.draggingLeftEvent = EventHelper.createEvent();
        this.stopDraggingEvent = EventHelper.createEvent2<IMouseEventData, IKeyboardState>();
        this.startDraggingEvent = EventHelper.createEvent2<IMouseEventData, IKeyboardState>();
        this.startResizingEvent = EventHelper.createEvent();
        this.resizingEvent = EventHelper.createEvent();
        this.stopResizingEvent = EventHelper.createEvent();
        this.startRotatingEvent = EventHelper.createEvent();
        this.rotatingEvent = EventHelper.createEvent();
        this.stopRotatingEvent = EventHelper.createEvent();
        this.mousemoveEvent = EventHelper.createEvent2<IMouseEventData, IKeyboardState>();
        this.mousedownEvent = EventHelper.createEvent2<IMouseEventData, IKeyboardState>();
        this.mouseupEvent = EventHelper.createEvent2<IMouseEventData, IKeyboardState>();
        this.dblclickEvent = EventHelper.createEvent2<IMouseEventData, IKeyboardState>();
        this.clickEvent = EventHelper.createEvent2<IMouseEventData, IKeyboardState>();


        this.mouseenterEvent = EventHelper.createEvent();
        this.mouseleaveEvent = EventHelper.createEvent();


        this.onElementClicked = EventHelper.createEvent();
        this.onElementDblClicked = EventHelper.createEvent2<IElementEventData, IKeyboardState>();
        this.onArtboardChanged = EventHelper.createEvent2<IArtboard, IArtboard>();
        this.inlineEditModeChanged = EventHelper.createEvent2<boolean, any>();
        this.inlineEditModeChanged.bind(this, this.onInlineEditModeChanged);
        //TODO: dispose?

        this.startDrawingEvent = EventHelper.createEvent();

        this._cancelBinding = this.app.actionManager.subscribe('cancel', this.cancel.bind(this));

        Keyboard.changed.bind(this, this._onKeyChanged);
        Selection.modeChangedEvent.bind(this, this._onSelectionModeChanged);

        this.actionManager = this.app.actionManager;

        this.interactionActive = false;
        this.startDraggingEvent.bind(this, this.onInteractionStarted);
        this.startRotatingEvent.bind(this, this.onInteractionStarted);
        this.startResizingEvent.bind(this, this.onInteractionStarted);

        this.stopDraggingEvent.bind(this, this.onInteractionStopped);
        this.stopRotatingEvent.bind(this, this.onInteractionStopped);
        this.stopResizingEvent.bind(this, this.onInteractionStopped);

        this._lastMouseMove = null;
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


    beginDrag(event, element: IUIElement, hideFrame: boolean = true) {
        var eventData: any = {
            mouseX: event.x,
            mouseY: event.y,
            x: event.x,
            y: event.y
        };

        if (hideFrame) {
            Selection.hideFrame();
        }

        this._draggingElement = ObjectFactory.construct(Types.DraggingElement, element, event);
        this._draggingElement.showOriginal(event.altKey);

        this.view.interactionLayer.add(this._draggingElement);
        var translation = this._draggingElement.getTranslation();
        this._draggingOffset = {
            x: event.x - translation.x,
            y: event.y - translation.y
        };

        eventData.transformationElement = this._draggingElement;
        this.startDraggingEvent.raise(eventData as any, Keyboard.state);
        this._draggingOverElement = null;
    }


    onmousedown(eventData) {
        this._noActionsBeforeClick = true;
        this._mouseDownData = eventData;

        this.mousedownEvent.raise(eventData, Keyboard.state);
        if (eventData.handled) {
            if (eventData.cursor) {
                this.updateCursor(eventData);
            }
            return;
        }

        if (this._captureElement) {
            this._captureElement.mousedown(eventData, Keyboard.state);
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
                Selection.setupSelectFrame(new this.deps.SelectFrame(onselect.bind(this)), eventData);

                this.view.interactionLayer.add(Selection.selectFrame);
            }
        }
    }

    onmousemove(eventData, keys: IKeyboardState = Keyboard.state) {
        if (!this._lastMouseMove && this._mouseDownData &&
            this._mouseDownData.x === eventData.x &&
            this._mouseDownData.y === eventData.y) {
            return; // do not realy rise mouse move if not movent after mouse down happened (bug on my laptop :) )
        }

        this._lastMouseMove = {
            x: eventData.x,
            y: eventData.y,
            isDragging: false,
            handled: false,
            cursor: null
        };

        eventData.isDragging = this._draggingElement !== null;
        if (this._mouseDownData) {
            if (eventData.x === this._mouseDownData.x && eventData.y === this._mouseDownData.y) {
                return;
            }
            delete this._mouseDownData;
        }

        this.mousemoveEvent.raise(eventData, keys);
        if (eventData.handled) {
            this._noActionsBeforeClick = false;
            this.updateCursor(eventData);
            return;
        }

        if (this._captureElement) {
            this._captureElement.mousemove(eventData, keys);
            this.updateCursor(eventData);
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
            this.beginDrag(this._startDraggingData, this._startDraggingElement);
            this._startDraggingData = null;
            this._startDraggingElement = null;
        }

        if (Selection.selectFrame !== null) {
            Selection.updateSelectFrame(eventData);

            Invalidate.requestInteractionOnly();
            return;
        }

        if (this._draggingElement) {
            dragging.call(this, {
                x: (eventData.x - this._draggingOffset.x),
                y: (eventData.y - this._draggingOffset.y),
                mouseX: eventData.x,
                mouseY: eventData.y,
                altKey: eventData.altKey,
                shiftKey: eventData.shiftKey,
                ctrlKey: eventData.ctrlKey
            }, keys);

            return;
        }

        this._bubbleMouseEvent(eventData, "mousemove");
        this.updateCursor(eventData);
    }

    repeatLastMouseMove(keys: IKeyboardState = Keyboard.state) {
        if (this._lastMouseMove) {
            this.onmousemove(this._lastMouseMove, keys);
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

        this.mouseupEvent.raise(eventData, Keyboard.state);
        if (eventData.handled) {
            if (eventData.cursor) {
                this.updateCursor(eventData);
            }
            return;
        }

        this._startDraggingData = null;
        this._startDraggingElement = null;

        if (this._captureElement) {
            this._captureElement.mouseup(eventData, Keyboard.state);
            if (eventData.cursor) {
                this.updateCursor(eventData);
            }
            return;
        }

        delete this._mouseDownData;

        if (Selection.selectFrame !== null) {

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
            stopDrag.call(this, eventData);
            this._draggingElement = null;
            return;
        }
    }

    ondblclick(eventData) {
        this.dblclickEvent.raise(eventData as any, Keyboard.state);
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
                this.onElementDblClicked.raise(eventData, Keyboard.state);
            }
        }
    }

    onclick(eventData, keys: IKeyboardState) {
        if (this._noActionsBeforeClick) {

            this.clickEvent.raise(eventData, keys);
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

    _onKeyChanged(newKeys, oldKeys) {
        if ((this.app.currentTool === ViewTool.Pointer || this.app.currentTool === ViewTool.PointerDirect) && !this.interactionActive) {
            Selection.directSelectionEnabled(newKeys.ctrl);
        }

        if (oldKeys.alt !== newKeys.alt) {
            var c = Cursor.getCursor();
            if (newKeys.alt && c === "move_cursor") {
                Cursor.setCursor("move_clone");
            }
            else if (!newKeys.alt && c === "move_clone") {
                Cursor.setCursor("move_cursor");
            }

            if (this._draggingElement) {
                this._draggingElement.showOriginal(newKeys.alt);
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
                var addToSelection = eventData.shiftKey;
                if (addToSelection) {
                    Selection.selectionMode("add");
                }
                Selection.makeSelection([element]);
                if (addToSelection) {
                    Selection.selectionMode("new");
                }

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

    onscroll(event) {
        this.view.scrollX(this.view.scrollX() + event.event.deltaX);
        this.view.scrollY(this.view.scrollY() + event.event.deltaY);
        Invalidate.request();
    }


    beginDragElement(event, element: IUIElement, stopDragPromise: Promise<IDropElementData>) {
        var eventData = this.createEventData(event);
        element.resetTransform();
        element.applyTranslation(new Point(Math.round(eventData.x - element.width() / 2), Math.round(eventData.y - element.height() / 2)));
        this._startDraggingElement = element;
        this.beginDrag(eventData, element, false);

        Cursor.setCursor("move_cursor");

        stopDragPromise
            .then(result => {
                var eventData = this.createEventData(result.e);
                var parent = this.getCurrentDropTarget(eventData, result.keys);
                var br = element.boundaryRect();

                this.cancel();
                this.insertAndSelect(result.elements, parent, eventData.x - br.width / 2, eventData.y - br.height / 2);

                this.stopDraggingEvent.raise(eventData as any, Selection.selectedElements());
            })
            .catch(e => {
                this.cancel();
                this.stopDraggingEvent.raise(null, null);
            });
    }

    insertAndSelect(elements: IUIElement[], parent: Container, x: number, y: number) {
        var newSelection = [];

        for (let i = 0; i < elements.length; i++) {
            let element = elements[i];

            if (parent instanceof CompositeElement) {
                for (let k = 0; k < parent.elements.length; ++k) {
                    var toInsert = k === 0 ? element : element.clone();
                    newSelection.push(parent.elements[k].add(toInsert));
                }
            }
            else if (element.props._unwrapContent) {
                parent.add(element);
                //TODO: add more strong typing
                newSelection = element['unwrapToParent']();
            }
            else {
                if (!parent.autoPositionChildren()) {
                    let newMatrix = element.viewMatrix().withTranslation(Math.round(x), Math.round(y));
                    element.setTransform(parent.globalMatrixToLocal(newMatrix));
                }
                newSelection.push(parent.add(element));
            }
        }

        Selection.makeSelection(newSelection);
    }

    getCurrentlyDraggedElements(): IUIElement[] {
        if (!this._startDraggingElement) {
            return [];
        }
        if (this._startDraggingElement instanceof CompositeElement) {
            return this._startDraggingElement.elements;
        }
        return [this._startDraggingElement];
    }

    getCurrentDropTarget(eventData: IMouseEventData, keys: IKeyboardState): Container | null {
        var parent = this._draggingOverElement;
        var selectComposite = Selection.selectComposite();
        if (selectComposite.canAccept([this._startDraggingElement], undefined, keys.ctrl)
            && selectComposite.hitTest(eventData, this.view.scale(), true)
        ) {
            parent = Selection.selectComposite();
        }
        return parent;
    }

    keyboardStateFromEvent(e: MouseEvent, mutableState?: IKeyboardState): IKeyboardState {
        if (mutableState) {
            mutableState.alt = e.altKey;
            mutableState.shift = e.shiftKey;
            mutableState.ctrl = e.metaKey || e.ctrlKey;
            return mutableState;
        }
        return { alt: e.altKey, shift: e.shiftKey, ctrl: e.metaKey || e.ctrlKey };
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
        this.interactionActive = true;
    }
    onInteractionStopped() {
        this.interactionActive = false;
    }

    choosePasteLocation(elements: IUIElement[], allowMoveIn?: boolean) {
        return choosePasteLocation(elements, null, allowMoveIn);
    }
}