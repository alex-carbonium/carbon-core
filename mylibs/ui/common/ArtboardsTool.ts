import SystemConfiguration from "../../SystemConfiguration";
import Selection from "../../framework/SelectionModel";
import Invalidate from "../../framework/Invalidate";
import Environment from "../../environment";
import Tool from "./Tool";
import Artboard from "../../framework/Artboard";
import ObjectFactory from "../../framework/ObjectFactory";
import PropertyTracker from "../../framework/PropertyTracker";
import Rect from "../../math/rect";
import Point from "../../math/point";
import ArtboardToolSettings from "ui/ArtboardToolSettings";
import { KeyboardState, IMouseEventData, IArtboard, ChangeMode, IContainer, IComposite, WorkspaceTool, IArtboardPage } from "carbon-core";
import Cursors from "Cursors";
import { PooledPair } from "../../framework/PooledPair";

export default class ArtboardsTool extends Tool {
    [name: string]: any;
    private _pointPair: PooledPair<Point>;
    private _rectPair: PooledPair<Rect>;
    private _element: Artboard;

    constructor(parameters?) {
        super("artboardTool");
        this._parameters = parameters;
        this._point = new Point(0, 0);

        //not disposed
        Selection.onElementSelected.bind(this, this.onSelection);
    }

    attach(app, view, controller, mousePressed) {
        super.attach(app, view, controller, mousePressed);
        view.snapController.calculateSnappingPoints(app.activePage);
        this.registerForDisposal(this._app.actionManager.subscribe('cancel', this.onCancelled));
        this._artboardToolSettings = new ArtboardToolSettings(app);
        this._enableArtboardSelection(true);
        this._app.activePage.setActiveArtboard(null);
    }

    detach() {
        super.detach.apply(this, arguments);
        this._artboardToolSettings = null;
        this.view().snapController.clearActiveSnapLines();
        Selection.clearSelection();
        this._enableArtboardSelection(false);
    }

    _enableArtboardSelection(value: boolean) {
        this._app.activePage.getAllArtboards().forEach(x => x.allowArtboardSelection(value));
    }

    private artboardAdded(artboard: Artboard) {
        artboard.suck();
        Selection.reselect();
        this.view().snapController.calculateSnappingPoints(this._app.activePage);
    }

    mousedown(event: IMouseEventData) {
        this._cursorNotMoved = true;

        if (event.shiftKey || event.ctrlKey || event.altKey) {
            return true;
        }

        var artboard = this._app.activePage.getArtboardAtPoint(event, event.view.scale());
        if (artboard) {
            return true;
        }

        this._mousepressed = true;
        this._prepareMousePoint(event);

        this._startPoint = { x: this._point.x, y: this._point.y };
        this._element = new Artboard();
        this._element.allowArtboardSelection(true);
        this._app.activePage.nameProvider.assignNewName(this._element);

        this._cursorNotMoved = true;

        var defaultSettings = this._app.defaultShapeSettings();
        if (defaultSettings && !this._element.noDefaultSettings) {
            this._element.setProps(defaultSettings);
        }

        if (this._parameters) {
            this._element.setProps(this._parameters);
        }

        this._pointPair = Point.createPair();
        this._rectPair = Rect.createPair();

        event.handled = true;
        PropertyTracker.suspend();
        return false;
    }

    mouseup(event: IMouseEventData) {
        this._mousepressed = false;
        this._ratioResizeInfo = null;

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
                this._controller.resetCurrentTool();
            }

            this.view().snapController.clearActiveSnapLines();
            Invalidate.requestInteractionOnly();
            PropertyTracker.resumeAndFlush();
            this._element = null;
        }
    }

    click(event: IMouseEventData) {
        let artboard = this._app.activePage.getArtboardAtPoint(event, event.view.scale());
        if (!Selection.isElementSelected(artboard)) {
            this._selectByClick(event);
        }
        event.handled = true;
    }

    mousemove(event: IMouseEventData) {
        if (event.cursor) { //active frame
            return true;
        }

        if (event.shiftKey || event.ctrlKey || event.altKey) {
            event.cursor = "default_cursor";
            return true;
        }

        var artboard = this._app.activePage.getArtboardAtPoint(event, event.view.scale());
        if (!artboard || artboard === this._element) {
            event.cursor = Cursors.ArtboardTool;
        }

        if (!this._mousepressed) {
            return true;
        }

        if (!this._element.isInTree()) {
            this._app.activePage.insert(this._element, this.findNewIndex(), ChangeMode.Self);
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
        var artboard = this._app.activePage.getArtboardAtPoint(event, event.view.scale());
        if (artboard !== null) {
            let mode = Selection.getSelectionMode(event, false);
            Selection.makeSelection([artboard], mode);

            event.cursor = Cursors.Move;
        }
    }

    _prepareMousePoint(event: IMouseEventData) {
        this._point.set(event.x, event.y);
        if (!event.ctrlKey) {
            var snapped = this.view().snapController.applySnappingForPoint(this._point);
            this._point.set(snapped.x, snapped.y);
        }
        this._point.roundMutable();
    }

    private findNewIndex() {
        for (let i = this._app.activePage.children.length - 1; i >= 0; --i) {
            let child = this._app.activePage.children[i];
            if (child instanceof Artboard) {
                return i + 1;
            }
        }
        return 0;
    }

    private onSelection(composite: IComposite) {
        if (Environment.controller.currentTool !== "artboardTool") {
            let reselect = false;
            let hasArtboards = false;
            for (let i = 0; i < composite.elements.length; ++i) {
                let isArtboard = composite.elements[i] instanceof Artboard;
                hasArtboards = hasArtboards || isArtboard;
                if (hasArtboards && !isArtboard) {
                    reselect = true;
                    break;
                }
            }

            if (reselect || hasArtboards) {
                let artboards = composite.elements.filter(x => x instanceof Artboard);
                Environment.controller.actionManager.invoke("artboardTool" as WorkspaceTool);
                Selection.makeSelection(artboards);
            }
        } else if(this._artboardToolSettings && (!composite || composite.elements.length === 0)) {
            Selection.makeSelection([this._artboardToolSettings], "new", false, true);
        }
    }

    private onCancelled = () => {
        Environment.controller.resetCurrentTool();
    }

    dispose() {
        Selection.onElementSelected.unbind(this, this.onSelection);

        super.dispose();
    }
}

