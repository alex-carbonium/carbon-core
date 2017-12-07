import EventHelper from "./EventHelper";
import CompositeElement from "./CompositeElement";
import domUtil from "utils/dom";
import Cursor from "./Cursor";
import TouchHelper from "./TouchHelper";
import Artboard from "./Artboard";
import { keyboard } from "../platform/Keyboard";
import { IApp, IController, IEvent, IEvent2, IMouseEventData, KeyboardState, IUIElement, IContainer, IComposite, IEvent3, WorkspaceTool, InteractionType, LayerType, ChangeMode, IView, IActionManager, IEventData } from "carbon-core";
import { IArtboard } from "carbon-model";

//TODO: extend DesignerController from base class
export default class ControllerBase implements IController {
    inlineEditor: any;
    isInlineEditMode: boolean;

    touchHelper: TouchHelper;
    actionManager: IActionManager;

    onArtboardChanged = EventHelper.createEvent2<IArtboard, IArtboard>();

    startDrawingEvent = EventHelper.createEvent<IEventData>();
    clickEvent = EventHelper.createEvent<IMouseEventData>();
    dblclickEvent = EventHelper.createEvent<IMouseEventData>();
    mousedownEvent = EventHelper.createEvent<IMouseEventData>();
    mousemoveEvent = EventHelper.createEvent<IMouseEventData>();
    mouseupEvent = EventHelper.createEvent<IMouseEventData>();

    onElementDblClicked = EventHelper.createEvent2<IMouseEventData, IUIElement>();

    interactionStarted = EventHelper.createEvent3<InteractionType, IMouseEventData, IComposite>();
    interactionProgress = EventHelper.createEvent3<InteractionType, IMouseEventData, IComposite>();
    interactionStopped = EventHelper.createEvent3<InteractionType, IMouseEventData, IComposite>();

    inlineEditModeChanged = EventHelper.createEvent2<boolean, any>();

    currentTool: WorkspaceTool = "pointerTool";
    currentToolChanged = EventHelper.createEvent<WorkspaceTool>();

    interactionActive: boolean = false;

    constructor(protected app: IApp, protected view: IView) {
        this.app = app;
        this.view = view;

        this.inlineEditModeChanged.bind(this, this.onInlineEditModeChanged);

        this.actionManager = this.app.actionManager;

        this.interactionStarted.bind(this, this.onInteractionStarted);
        this.interactionStopped.bind(this, this.onInteractionStopped);

        this.touchHelper = new TouchHelper(view);
    }

    updateCursor(eventData?) {
    }
    defaultCursor(): string {
        return "default_cursor";
    }

    onWindowResize() {
    }

    ondoubletap() {
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

    isDragging() {
        return false;
    }

    onmousedown(eventData) {
        this.mousedownEvent.raise(eventData);
    }

    onmousemove(eventData: IMouseEventData) {
        this.mousemoveEvent.raise(eventData);
        this.updateCursor(eventData);
    }

    repeatLastMouseMove(keys: KeyboardState = keyboard.state) {
    }

    onmouseenter(eventData) {
    }

    onmouseleave(eventData) {
    }

    onmouseup(eventData) {
        this.mouseupEvent.raise(eventData);
    }

    onmiddlemouseup(event) {
        this.actionManager.invoke("handToolRelease");
        event.handled = true;
    }

    onmiddlemousedown(event) {
        this.actionManager.invoke("handTool" as WorkspaceTool, "active");
        event.handled = true;
    }

    ondblclick(eventData) {
        this.dblclickEvent.raise(eventData);
    }

    onclick(eventData) {
        this.clickEvent.raise(eventData);
    }

    onblur() {
    }

    selectByClick(eventData) {
    }

    beginDragElements(event: MouseEvent, elements: IUIElement[], stopDragPromise: Promise<void>) {
    }

    insertAndSelect(elements: IUIElement[], parent: IContainer | IComposite) {
    }

    getCurrentDropTarget(): IContainer {
        return null;
    }

    captureMouse(element) {
    }

    releaseMouse() {
    }

    showContextMenu(eventData) {
    }

    onInlineEditModeChanged(mode, editor) {
        this.isInlineEditMode = mode;
        this.inlineEditor = editor;
    }

    raiseInteractionStarted(type: InteractionType, event: IMouseEventData) {
    }
    raiseInteractionProgress(type: InteractionType, event: IMouseEventData) {
    }
    raiseInteractionStopped(type: InteractionType, event: IMouseEventData) {
    }

    onInteractionStarted() {
    }
    onInteractionStopped() {
    }

    choosePasteLocation(elements: IUIElement[], allowMoveIn?: boolean) {
        return null;
    }

    resetCurrentTool() {
    }
}