import Tool from "../Tool";
import SectionDecorator from "./SectionDecorator";
import Section from "../../../framework/Section";
import Artboard from "../../../framework/Artboard";
import NullArtboard from "../../../framework/NullArtboard";
import Selection from "../../../framework/SelectionModel"
import Cursor from "../../../framework/Cursor";
import Invalidate from "../../../framework/Invalidate";
import {LayerType} from "carbon-app";

var decorator = null;

export default class SectionCreator extends Tool {
    constructor(){
        super("sectionTool");
    }

    attach(app, view, controller) {
        this._app = app;
        this._view = view;
        this._controller = controller;
        controller.mousemoveEvent.bind(this, this.onMouseMove);
        controller.mousedownEvent.bind(this, this.onMouseDown);
        controller.startResizingEvent.bind(this, this.onStartResizing);
        controller.stopResizingEvent.bind(this, this.onStopResizing);
        view.scaleChanged.bind(this, this.onScaleChanged);
        Selection.onElementSelected.bind(this, this.onSelection);
        view.registerForLayerDraw(LayerType.Interaction, this);
        Invalidate.request();
    }

    detach() {
        this._detachDecorator();
        this._controller.mousemoveEvent.unbind(this, this.onMouseMove);
        this._controller.mousedownEvent.unbind(this, this.onMouseDown);
        this._controller.startResizingEvent.unbind(this, this.onStartResizing);
        this._controller.stopResizingEvent.unbind(this, this.onStopResizing);
        this._view.scaleChanged.unbind(this, this.onScaleChanged);
        Selection.onElementSelected.unbind(this, this.onSelection);
        this._view.unregisterForLayerDraw(LayerType.Interaction, this);
        Invalidate.request();
        this.suckContent();
    }

    onMouseMove(event) {
        if (decorator) {
            decorator.updateCursor(event);
        }
    }

    onSelection(selection) {
        this._detachDecorator();
        var element = selection.singleOrDefault();
        if (element && (element instanceof Artboard || element instanceof Section)) {
            this._attachDecorator(selection.view, element);
        }
    }

    onMouseDown(event) {
        if (decorator) {
            decorator.click(event);
            if (event.handled) {
                this._refreshDecorator();
            }
        }
    }

    onLayerDraw(layer, context) {
        if (decorator) {
            decorator.draw(context);
        }
    }

    onScaleChanged() {
        this._refreshDecorator();
    }

    onStartResizing() {
        this._prevDecorator = decorator;
        this._detachDecorator();
    }

    onStopResizing() {
        if (this._prevDecorator) {
            decorator = this._prevDecorator;
            this._refreshDecorator();
            this._prevDecorator = null;
        }
    }

    suckContent() {
        var artboard = this._app.activePage.getActiveArtboard();
        if(artboard === NullArtboard){
            return;
        }
        Section.suckContent(artboard);
    }

    _refreshDecorator() {
        if (decorator) {
            var element = decorator.element;
            this._detachDecorator();
            this._attachDecorator(view, element);
        }
    }

    _attachDecorator(view, element) {
        decorator = new SectionDecorator();
        decorator.attach(view, element, this._view.scale());
    }

    _detachDecorator() {
        Cursor.removeGlobalCursor(true);
        decorator = null;
    }
}