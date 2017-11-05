import EventHelper from "framework/EventHelper";
import domUtil from "utils/dom";
import TouchHelper from "./TouchHelper";
import PropertyTracker from "framework/PropertyTracker";
import DataNode from "framework/DataNode";
import Selection from "./SelectionModel";
import { MirrorViewMode } from "framework/Defs";
import { IController, WorkspaceTool, IComposite, IMouseEventData, IArtboard, IUIElement, IEvent2, IActionManager, IApp, IContainer } from "carbon-core";
import { InteractionType } from "carbon-app";
import { choosePasteLocation } from "./PasteLocator";

function updateEvent(event) {
    var scale = this.view.scale();
    domUtil.layerX(event, Math.round((domUtil.layerX(event) + this.view.scrollX()) * 100 / scale) / 100);
    domUtil.layerY(event, Math.round((domUtil.layerY(event) + this.view.scrollY()) * 100 / scale) / 100);
}

export default class MirroringController implements IController {
    [x: string]: any;

    currentToolChanged = EventHelper.createEvent<WorkspaceTool>();
    startDrawingEvent = EventHelper.createEvent<any>();

    interactionStarted = EventHelper.createEvent3<InteractionType, IMouseEventData, IComposite>();
    interactionProgress = EventHelper.createEvent3<InteractionType, IMouseEventData, IComposite>();
    interactionStopped = EventHelper.createEvent3<InteractionType, IMouseEventData, IComposite>();
    interactionActive = false;

    onArtboardChanged = EventHelper.createEvent2<IArtboard, IArtboard>();

    clickEvent = EventHelper.createEvent<IMouseEventData>();
    dblclickEvent = EventHelper.createEvent<IMouseEventData>();
    mousedownEvent = EventHelper.createEvent<IMouseEventData>();
    mousemoveEvent = EventHelper.createEvent<IMouseEventData>();
    mouseupEvent = EventHelper.createEvent<IMouseEventData>();

    onElementDblClicked: IEvent2<IMouseEventData, IUIElement>;

    inlineEditModeChanged = EventHelper.createEvent2<boolean, any>();

    actionManager: IActionManager;

    private _currentTool: WorkspaceTool = "protoTool";

    constructor(app: IApp, view, followUserId) {
        this.app = app;
        this.view = view;
        this.followUserId = followUserId;
        this.touchHelper = new TouchHelper(view);

        this.app.enablePropsTracking();
        PropertyTracker.propertyChanged.bind(this, this._appPropertyChanged);

        this.actionManager = app.actionManager;
    }

    _appPropertyChanged(app: IApp, newProps, oldProps) {
        var artboardId = app.getUserSetting<string>(this.followUserId, 'mirrorArtboardId');
        if (artboardId != this._currentArtboardId) {
            var pageId = app.getUserSetting<string>(this.followUserId, 'mirrorPageId');
            var page = DataNode.getImmediateChildById(app, pageId, true);
            if (page) {
                var artboard = DataNode.getImmediateChildById(page, artboardId, true);
                var prevArtboard = page.getActiveArtboard();
                page.setActiveArtboard(artboard, true);
                this.onArtboardChanged.raise(artboard, prevArtboard);
            }
        }
    }

    onWindowResize() {
        if (this.view.mode === MirrorViewMode.Fit) {
            this.view.page.fitToViewport();
        }
    }

    onmiddlemouseup(event) {
    }

    onmiddlemousedown(event) {
    }

    _propagateScroll(delta, element) {
        if (delta.dx === 0 && delta.dy === 0) {
            return;
        }

        if (!element || element === this.view) {
            this.view.scrollX(this.view.scrollX() + delta.dx);
            this.view.scrollY(this.view.scrollY() + delta.dy);
            return;
        }

        if (typeof element.scrollX === 'function') {
            var oldX = element.scrollX();
            element.scrollX(oldX + delta.dx);
            delta.dx -= (oldX - element.scrollX());

            var oldY = element.scrollY();
            element.scrollY(oldY + delta.dy);
            delta.dY -= (oldY - element.scrollY());
        }

        var parent = element.parent();
        if (parent) {
            this._propagateScroll(delta, parent);
        }
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
        this.view.invalidate();
    }

    onpinchstart(event) {
        this.touchHelper.onpinchstart(event);
    }

    onpinchend(event) {
        this.touchHelper.onpinchend(event);
    }

    onscroll(eventData) {
        var element = this.view.page.hitElement(eventData, this.view.scale());
        var delta = { dx: eventData.event.deltaX, dy: eventData.event.deltaY };
        this._propagateScroll(delta, element);
    }

    onmousedown(eventData) {
    }

    onmousemove(eventData) {
    }

    onmouseenter(eventData) {
    }

    onmouseleave(eventData) {
    }

    onmouseup(eventData) {
    }

    ondoubletap() {
        this.ondblclick();
    }

    ondblclick() {

        // hack: this is the hack to prevent double tap and dblclick called at the same time
        if (this._disableDblClick) {
            return;
        }
        this._disableDblClick = true;
        setTimeout(() => {
            this._disableDblClick = false;
        }, 100);
        // end of hack


        if (!this.view.mode) {
            this.view.mode = MirrorViewMode.Fit;
            this.view.page.fitToViewport();
        } else {
            this.view.mode = MirrorViewMode.OriginalSize;
            this.view.scale(1);
        }
        this.view.page._version = null;
        this.view.invalidate();
    }

    onclick(eventData) {
    }


    beginDragElement(event, element, stopDragPromise) {
    }


    captureMouse(/*UIElement*/element) {
        this._captureElement = element;
    }

    releaseMouse() {
        this._captureElement = null;
    }

    showContextMenu(event) {
    }

    cancel() {
    }

    isDragging() {
        return false;
    }

    createEventData(event) {
        updateEvent.call(this, event);
        return {
            handled: false,
            x: domUtil.layerX(event),
            y: domUtil.layerY(event),
            event: event,
            ctrlKey: event.ctrlKey || event.metaKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
            view: this
        }
    }

    raiseInteractionStarted(type: InteractionType, event: IMouseEventData) {
        this.interactionStarted.raise(type, event, Selection.selectComposite());
    }
    raiseInteractionProgress(type: InteractionType, event: IMouseEventData) {
        this.interactionProgress.raise(type, event, Selection.selectComposite());
    }
    raiseInteractionStopped(type: InteractionType, event: IMouseEventData) {
        this.interactionStopped.raise(type, event, Selection.selectComposite());
    }

    updateCursor(eventData?) {
    }
    defaultCursor(): string {
        return "default_cursor";
    }

    choosePasteLocation(elements: IUIElement[], allowMoveIn?: boolean) {
        return choosePasteLocation(elements, null, allowMoveIn);
    }

    insertAndSelect(elements: IUIElement[], parent: IContainer | IComposite) {
    }

    getCurrentDropTarget(eventData: IMouseEventData): IContainer | IComposite | null {
        return null;
    }

    get currentTool(): WorkspaceTool {
        return this._currentTool;
    }

    set currentTool(tool: WorkspaceTool) {
        var old = this._currentTool;
        this._currentTool = tool;
        if (old !== tool) {
            this.currentToolChanged.raise(tool);
        }
    }
    resetCurrentTool() {
        this.actionManager.invoke("pointerTool" as WorkspaceTool);
    }

    selectByClick(eventData) {
    }

    repeatLastMouseMove() {
    }
}