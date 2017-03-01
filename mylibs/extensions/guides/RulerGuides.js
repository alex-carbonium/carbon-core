import Brush from "../../framework/Brush";
import Invalidate from "../../framework/Invalidate";
import DragController from "../../framework/DragController";
import SnapController from "../../framework/SnapController";
import Cursor from "../../framework/Cursor";
import CustomGuides from "./CustomGuides";
import UserSettings from "../../UserSettings";
import { isPointInRect } from "../../math/math";
import { PatchType, ViewTool } from "../../framework/Defs";
import { createUUID } from "../../util";
import NullArtboard from "../../framework/NullArtboard";
import Artboard from "../../framework/Artboard";
import Keyboard from "../../platform/Keyboard";
import { IApp, IView, IController, IDisposable, IRect, IMouseEventData } from "../../framework/CoreModel";

const config = UserSettings.ruler;

export default class RulerGuides {
    _dragController: DragController;
    _menuToken: IDisposable;
    _rectHorizontal: IRect;
    _rectVertical: IRect;
    _lastGlobalCursor: string = null;

    constructor(app: IApp, view: IView, controller: IController) {
        this._dragController = new DragController();
        this._dragController.onSearching = this.onDragSearching;
        this._dragController.onStarting = this.onDragStarting;
        this._dragController.onDragging = this.onDragging;
        this._dragController.onStopped = this.onDragStopped;
        this._dragController.onClicked = this.onClicked;
        this._dragController.bindToController(controller);

        controller.startDrawingEvent.bind(this, this.onStartDrawing);

        this._menuToken = app.onBuildMenu.bind(this, this.onBuildMenu);

        this._customGuides = new CustomGuides(view);
        SnapController.snapGuides.push(this._customGuides);

        this._origin = null;
        this._originRect = null;
        this._guideX = null;
        this._guideY = null;
        this._rectHorizontal = null;
        this._rectVertical = null;

        this._app = app;
        this._view = view;

        this._hoverArtboard = null;
        this._cursorChanged = false;
        this._removingGuide = false;
    }

    setOrigin(origin) {
        this._origin = origin;
        this._originRect = origin.getBoundingBox();
    }
    setGuides(artboard: Artboard) {
        if (artboard && artboard.props.guidesX && artboard.props.guidesY) {
            this._customGuides.prepareAndSetProps({
                guidesX: artboard.props.guidesX,
                guidesY: artboard.props.guidesY,
                origin: artboard.position()
            });
        }
        else {
            this._customGuides.prepareAndSetProps({
                guidesX: null,
                guidesY: null
            });
        }
    }
    setRulerBounds(horizontal, vertical) {
        this._rectHorizontal = horizontal;
        this._rectVertical = vertical;
    }
    active() {
        if (this.guidesEnabled() && this._origin !== null && this._rectHorizontal !== null
            && this._origin !== NullArtboard) {
            return true;
        }
        return false;
    }
    canCapture(): boolean {
        return Keyboard.state.ctrl || this._app.currentTool === ViewTool.Pointer || this._app.currentTool === ViewTool.PointerDirect;
    }

    onDragSearching = (e: IMouseEventData) => {
        if (!this.active()) {
            return;
        }

        if (isPointInRect(this._rectVertical, e)) {
            e.cursor = "ew-resize";
            return;
        }
        if (isPointInRect(this._rectHorizontal, e)) {
            e.cursor = "ns-resize";
            return;
        }

        let canCapture = this.canCapture();
        let x = Math.round(e.x) - this._originRect.x;
        if (canCapture && this._customGuides.tryCaptureX(x)) {
            e.cursor = "ew-resize";
            this._customGuides.releaseCaptured();
            Invalidate.requestUpperOnly();
            return;
        }

        let y = Math.round(e.y) - this._originRect.y;
        if (canCapture && this._customGuides.tryCaptureY(y)) {
            e.cursor = "ns-resize";
            this._customGuides.releaseCaptured();
            Invalidate.requestUpperOnly();
            return;
        }

        this._guideX = null;
        this._customGuides.releaseCaptured();
    };
    onDragStarting = (e) => {
        if (!this.active()) {
            return false;
        }

        let x = Math.round(e.x - this._origin.x());
        let y = Math.round(e.y - this._origin.y());

        if (isPointInRect(this._rectVertical, e)) {
            this._guideX = { id: "", pos: x };
        }
        else if (isPointInRect(this._rectHorizontal, e)) {
            this._guideY = { id: "", pos: y };
        }
        else if (this.canCapture() && this._customGuides.tryCaptureX(x)) {
            this._guideX = Object.assign({}, this._customGuides.props.guidesX[this._customGuides.capturedIndexX]);
        }
        else if (this.canCapture() && this._customGuides.tryCaptureY(y)) {
            this._guideY = Object.assign({}, this._customGuides.props.guidesY[this._customGuides.capturedIndexY]);
        }

        var canStart = this._guideX !== null || this._guideY !== null;
        if (canStart) {
            Invalidate.requestUpperOnly();
            SnapController.removeGuides(this._customGuides);
        }
        return canStart;
    };
    onDragging = e => {
        if (this._guideX !== null || this._guideY !== null) {
            var artboard = this._app.activePage.getArtboardAtPoint(e);
            if (artboard !== this._hoverArtboard) {
                this._hoverArtboard = artboard;
                if (artboard) {
                    SnapController.calculateSnappingPoints(artboard);
                }
            }
        }

        if (this._guideX !== null) {
            if (this._guideX.id && isPointInRect(this._rectVertical, e)) {
                this._removingGuide = true;
            }
            else {
                let pos = e.ctrlKey ? e : SnapController.applySnappingForPoint(e, false, true);
                this._guideX.pos = Math.round(pos.x) - this._origin.x();
                this._removingGuide = false;
            }
            Invalidate.requestUpperOnly();
        }
        else if (this._guideY !== null) {
            if (this._guideY.id && e.y < this._rectHorizontal.y + this._rectHorizontal.height) {
                this._removingGuide = true;
            }
            else {
                let pos = e.ctrlKey ? e : SnapController.applySnappingForPoint(e, true, false);
                this._guideY.pos = Math.round(pos.y) - this._origin.y();
                this._removingGuide = false;
            }
            Invalidate.requestUpperOnly();
        }
    };
    onDragStopped = e => {
        SnapController.snapGuides.push(this._customGuides);
        SnapController.clearActiveSnapLines();

        if (this._guideX !== null) {
            let shouldDelete = isPointInRect(this._rectVertical, e);
            if (this._guideX.id && shouldDelete) {
                this.deleteGuideX(this._guideX);
            }
            else if (!shouldDelete) {
                if (!this._guideX.id) {
                    this._guideX.id = createUUID();
                    this._origin.patchProps(PatchType.Insert, "guidesX", this._guideX)
                }
                else {
                    this._origin.patchProps(PatchType.Change, "guidesX", this._guideX)
                }
            }
        }
        else if (this._guideY !== null) {
            let shouldDelete = e.y < this._rectHorizontal.y + this._rectHorizontal.height;
            if (this._guideY.id && shouldDelete) {
                this.deleteGuideY(this._guideY);
            }
            else if (!shouldDelete) {
                if (!this._guideY.id) {
                    this._guideY.id = createUUID();
                    this._origin.patchProps(PatchType.Insert, "guidesY", this._guideY)
                }
                else {
                    this._origin.patchProps(PatchType.Change, "guidesY", this._guideY)
                }
            }
        }

        this._guideX = null;
        this._guideY = null;

        this._hoverArtboard = null;
        this._removingGuide = false;

        this._customGuides.releaseCaptured();
        Invalidate.requestUpperOnly();
    };
    onClicked = e => {
        if (this._guideX || this._guideY) {
            this._guideX = null;
            this._guideY = null;
            this._customGuides.releaseCaptured();
            Invalidate.requestUpperOnly();
            e.handled = true;
        }
    };
    onStartDrawing(e: IMouseEventData) {
        if (!this.active()) {
            return;
        }

        var react = Keyboard.state.ctrl;

        if (!react) {
            let x = Math.round(e.x - this._origin.x());
            let y = Math.round(e.y - this._origin.y());

            react = isPointInRect(this._rectVertical, e) || isPointInRect(this._rectHorizontal, e);
        }

        e.handled = react;
    }

    guidesEnabled() {
        return this._app.props.customGuides.show;
    }

    drawX(context, minx, viewportHeight) {
        if (this.guidesEnabled()) {
            this._customGuides.drawX(context, minx, viewportHeight);
        }

        if (this._guideX !== null && !this._removingGuide) {
            context.beginPath();
            var x = this._guideX.pos * this._view.scale() - minx + .5 | 0;

            let text = "" + (this._guideX.pos + .5 | 0);
            context.fillStyle = "white";
            var w = context.measureText(text).width + 2;
            context.fillRect(x + 1, viewportHeight / 2 - config.font_size / 2 + .5 | 0, w, config.font_size);
            context.fillStyle = "black";
            context.fillText(text, x + 2 + .5 | 0, viewportHeight / 2 + 3 + .5 | 0);

            context.globalAlpha = .3;
            context.beginPath();
            context.moveTo(x + .5, 0);
            context.lineTo(x + .5, viewportHeight);
            Brush.stroke(this._customGuides.stroke(), context);
            context.globalAlpha = 1;
        }
    }

    drawY(context, miny, viewportWidth) {
        if (this.guidesEnabled()) {
            this._customGuides.drawY(context, miny, viewportWidth);
        }

        if (this._guideY !== null && !this._removingGuide) {
            context.beginPath();
            var y = this._guideY.pos * this._view.scale() - miny + .5 | 0;

            let text = "" + (this._guideY.pos + .5 | 0);
            context.fillStyle = "white";
            var w = context.measureText(text).width + 2;
            context.fillRect(viewportWidth / 2 - w / 2 + .5 | 0, y - config.font_size - 1, w, config.font_size);
            context.fillStyle = "black";
            context.fillText(text, viewportWidth / 2 - w / 2 + 1.5 | 0, y - config.font_size / 2 + 2.5 | 0);

            context.globalAlpha = .3;
            context.beginPath();
            context.moveTo(0, y + .5);
            context.lineTo(viewportWidth, y + .5);
            Brush.stroke(this._customGuides.stroke(), context);
            context.globalAlpha = 1;
        }
    }

    onBuildMenu(context, menu) {
        if (!this.active() || !context.eventData) {
            return;
        }

        var hit = false;
        var items = [];

        var x = Math.round(context.eventData.x) - this._origin.x();
        var gx = this._customGuides.tryCaptureX(x);
        if (gx !== null) {
            items.push({
                name: "Delete guide",
                callback: this.deleteGuideX.bind(this, gx)
            });

            hit = true;
        }
        else {
            var y = Math.round(context.eventData.y) - this._origin.y();
            var gy = this._customGuides.tryCaptureY(y);
            if (gy !== null) {
                items.push({
                    name: "Delete guide",
                    callback: this.deleteGuideY.bind(this, gy)
                });

                hit = true;
            }
        }

        if (!hit) {
            hit = isPointInRect(this._rectHorizontal, context.eventData) || isPointInRect(this._rectVertical, context.eventData);
        }

        if (hit) {
            menu.items = items;

            menu.items.push({
                name: "Delete all guides",
                items: [
                    {
                        name: "On current artboard",
                        callback: () => this.deleteGuidesOnArtboard()
                    },
                    {
                        name: "On current page",
                        callback: () => this.deleteGuidesOnPage()
                    }
                ],
                callback: () => this.deleteAllGuides()
            });

            this._customGuides.releaseCaptured();
            Cursor.removeGlobalCursor();
            Invalidate.requestUpperOnly();
        }
    }

    deleteGuideX(gx) {
        this._origin.patchProps(PatchType.Remove, "guidesX", gx);
        Invalidate.requestUpperOnly();
    }
    deleteGuideY(gy) {
        this._origin.patchProps(PatchType.Remove, "guidesY", gy);
        Invalidate.requestUpperOnly();
    }
    deleteGuidesOnArtboard() {
        this._origin.setProps({ guidesX: [], guidesY: [] });
        Invalidate.requestUpperOnly();
    }
    deleteGuidesOnPage() {
        var artboards = this._view.page.getAllArtboards();
        for (var i = 0; i < artboards.length; i++) {
            artboards[i].setProps({ guidesX: [], guidesY: [] });
        }
        Invalidate.requestUpperOnly();
    }

    dispose() {
        this._dragController.unbind();
        SnapController.removeGuides(this._customGuides);

        if (this._menuToken) {
            this._menuToken.dispose();
            this._menuToken = null;
        }
    }
}