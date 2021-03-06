import SystemConfiguration from "../../SystemConfiguration";
import Selection from "../../framework/SelectionModel";
import Invalidate from "../../framework/Invalidate";
import Tool from "./Tool";
import Artboard from "../../framework/Artboard";
import PropertyTracker from "../../framework/PropertyTracker";
import Rect from "../../math/rect";
import Point from "../../math/point";
import { IMouseEventData, ChangeMode, IContainer, IController, IView, IApp } from "carbon-core";
import Cursors from "../../Cursors";
import { PooledPair } from "../../framework/PooledPair";

export default class ArtboardsTool extends Tool {
    private _pointPair: PooledPair<Point>;
    private _rectPair: PooledPair<Rect>;
    private _element: Artboard;
    private _point: Point;
    private _cursorNotMoved: boolean;
    private _mousepressed: boolean;
    private _startPoint: { x: number; y: number; };

    constructor(app: IApp, view: IView, controller: IController) {
        super("artboardTool", app, view, controller);
        this._point = new Point(0, 0);
    }

    attach() {
        super.attach();
        this.view.snapController.calculateSnappingPoints(this.app.activePage);
        this.registerForDisposal(this.app.actionManager.subscribe('cancel', this.onCancelled));
        this._enableArtboardSelection(true);
        this.app.activePage.setActiveArtboard(null);
    }

    detach() {
        super.detach.apply(this, arguments);
        this.view.snapController.clearActiveSnapLines();
        Selection.clearSelection();
        this._enableArtboardSelection(false);
    }

    _enableArtboardSelection(value: boolean) {
        this.app.activePage.getAllArtboards().forEach(x => x.allowArtboardSelection(value));
    }

    private artboardAdded(artboard: Artboard) {
        artboard.suck();
        Selection.reselect();
        this.view.snapController.calculateSnappingPoints(this.app.activePage);
    }

    mousedown(event: IMouseEventData) {
        this._cursorNotMoved = true;

        if (event.shiftKey || event.ctrlKey || event.altKey) {
            return true;
        }

        var artboard = this.app.activePage.getArtboardAtPoint(event, event.view);
        if (artboard) {
            if (!Selection.isElementSelected(artboard)) {
                this._selectByClick(event);
            }

            return true;
        }

        this._mousepressed = true;
        this._prepareMousePoint(event);

        this._startPoint = { x: this._point.x, y: this._point.y };
        this._element = new Artboard();
        this._element.allowArtboardSelection(true);
        this.app.activePage.nameProvider.assignNewName(this._element);

        this._cursorNotMoved = true;

        var defaultSettings = this.app.defaultShapeSettings();
        if (defaultSettings && !this._element.noDefaultSettings) {
            this._element.setProps(defaultSettings);
        }

        this._pointPair = Point.createPair();
        this._rectPair = Rect.createPair();

        event.handled = true;
        PropertyTracker.suspend();

        return false;
    }

    mouseup() {
        this._mousepressed = false;

        if (this._element) {
            var br = this._element.boundaryRect();
            var gm = this._element.globalViewMatrix();

            if (br.width > 0 && br.height > 0) {
                let rect = this._rectPair.swap();
                rect.x = br.x;
                rect.y = br.y;
                rect.width = br.width;
                rect.height = br.height;

                let t = this._pointPair.swap();
                t.x = gm.tx;
                t.y = gm.ty;

                this._element.resetTransform(ChangeMode.Self);
                this._element.applyTranslation(t);
                this._element.boundaryRect(rect);

                let parent = this._element.parent as IContainer;
                parent.remove(this._element, ChangeMode.Self);
                parent.insert(this._element, this.findNewIndex());
                Selection.refreshSelection([this._element]);

                this.artboardAdded(this._element);
            }
            else if (this._element.isInTree()) {
                this._element.parent.remove(this._element);
            }

            if (SystemConfiguration.ResetActiveToolToDefault) {
                this.controller.resetCurrentTool();
            }

            this.view.snapController.clearActiveSnapLines();
            Invalidate.requestInteractionOnly();
            PropertyTracker.resumeAndFlush();
            this._element = null;
        }
    }

    click() {
        // let artboard = this._app.activePage.getArtboardAtPoint(event, event.view);
        // if (!Selection.isElementSelected(artboard)) {
        //     this._selectByClick(event);
        // }
        // event.handled = true;
    }

    mousemove(event: IMouseEventData) {
        if (event.cursor) { //active frame
            return true;
        }

        if (event.shiftKey || event.ctrlKey || event.altKey) {
            event.cursor = "default_cursor";
            return true;
        }

        var artboard = this.app.activePage.getArtboardAtPoint(event, event.view);
        if (!artboard || artboard === this._element) {
            event.cursor = Cursors.ArtboardTool;
        }

        if (!this._mousepressed) {
            return true;
        }

        if (!this._element.isInTree()) {
            this.app.activePage.insert(this._element, this.findNewIndex(), ChangeMode.Self);
            Selection.makeSelection([this._element], "new", false, true);
        }

        this._prepareMousePoint(event);

        if (this._cursorNotMoved) {
            this._cursorNotMoved = (this._point.y === this._startPoint.y) && (this._point.x === this._startPoint.x);
        }

        var x2, y2;

        //if use holds shift, we must fit shape into square
        if (event.shiftKey) {
            var height = Math.abs(this._point.y - this._startPoint.y);
            var width = Math.abs(this._point.x - this._startPoint.x);
            var ratio = Math.min(height, width);

            x2 = this._startPoint.x + ratio;
            y2 = this._startPoint.y + ratio;
        }
        else {
            x2 = this._point.x;
            y2 = this._point.y;
        }

        var x1 = this._startPoint.x, y1 = this._startPoint.y
            , x = Math.min(x1, x2)
            , y = Math.min(y1, y2)
            , w = Math.abs(x1 - x2)
            , h = Math.abs(y1 - y2);

        let br = this._rectPair.swap();
        br.width = w;
        br.height = h;

        let t = this._pointPair.swap();
        t.x = x;
        t.y = y;

        this._element.resetTransform(ChangeMode.Self);
        this._element.prepareAndSetProps({ br }, ChangeMode.Self);
        this._element.applyTranslation(t, false, ChangeMode.Self);

        Invalidate.requestInteractionOnly();
        event.handled = true;
        return false;
    }

    _selectByClick(event: IMouseEventData) {
        var artboard = this.app.activePage.getArtboardAtPoint(event, event.view);
        if (artboard !== null) {
            let mode = Selection.getSelectionMode(event, false);
            Selection.makeSelection([artboard], mode);

            event.cursor = Cursors.Move;
        }
    }

    _prepareMousePoint(event: IMouseEventData) {
        this._point.set(event.x, event.y);
        if (!event.ctrlKey) {
            var snapped = this.view.snapController.applySnappingForPoint(this._point);
            this._point.set(snapped.x, snapped.y);
        }
        this._point.roundMutable();
    }

    private findNewIndex() {
        for (let i = this.app.activePage.children.length - 1; i >= 0; --i) {
            let child = this.app.activePage.children[i];
            if (child instanceof Artboard) {
                return i + 1;
            }
        }
        return 0;
    }

    private onCancelled = () => {
        this.controller.resetCurrentTool();
    }

    dispose() {
        super.dispose();
    }
}

