import { IText, IApp, IMouseEventData, IController, IDisposable } from "carbon-core";
import InlineTextEditor from "./text/inlinetexteditor";
import Text from "./text/Text";
import Invalidate from "./Invalidate";
import UIElement from "./UIElement";
import Environment from "../environment";
import DragController from "./DragController";
import Cursor from "./Cursor";

export class PreviewTextTool {
    private tokens: IDisposable[] = [];
    private dragController: DragController;
    private text: Text;
    private editor: any;
    private next: { element: Text; event: IMouseEventData };

    constructor(private app: IApp, private controller: IController) {
        this.dragController = new DragController();
        this.dragController.onSearching = this.onDragSearching;
        this.dragController.onStarting = this.onDragStarting;
        this.dragController.onDragging = this.onDragging;
        this.dragController.onStopped = this.onDragStopped;
        this.dragController.bindToController(controller);

        this.tokens.push(controller.dblclickEvent.bind(this, this.onDblClickEvent));
    }

    onDragSearching = (e: IMouseEventData) => {
        if (this.hittingEdited(e)) {
            e.cursor = "text";
            return;
        }
        var hit = this.hitNewElement(e);
        if (hit instanceof Text && hit !== this.text) {
            this.next = { element: hit, event: e };
            e.cursor = 'text';
            Invalidate.requestInteractionOnly();
        }
        else {
            if (this.next) {
                this.next = null;
                Invalidate.requestInteractionOnly();
            }
        }
    }
    onDragStarting = e => {
        if (this.hittingEdited(e)) {
            if (!e.shiftKey) { //not to interfere with shift+click selection
                this.editor.mouseDown(e);
            }
            return;
        }

        if (this.editor) {
            this.editor.deactivate(true);
        }

        var hit = this.hitNewElement(e);
        if (hit instanceof Text) {
            this.createEditor(hit);
            this.editor.mouseDown(e, e["event"]);
        }

        Invalidate.requestInteractionOnly();
    }
    onDragging = (e: IMouseEventData, dx, dy) => {
        if (this.editor) {
            this.editor.mouseMove(e);
            e.cursor = 'text';
        }

        Invalidate.requestInteractionOnly();
    }
    onDragStopped = e => {
        if (this.editor) {
            this.editor.mouseUp(e);
        }
        Invalidate.requestInteractionOnly();
    }

    onDblClickEvent = (e: IMouseEventData) => {
        if (this.hittingEdited(e)) {
            this.editor.mouseDown(e);
            this.editor.mouseUp(e);
            this.editor.mouseDblClick(e);
            e.handled = true;
        }
    }

    private hittingEdited(e) {
        if (!this.editor) {
            return false;
        }
        return this.text.hitTest(e, Environment.view.scale());
    }

    private hitNewElement(e) {
        return Environment.view.hitElementDirect(e);
    }

    private createEditor(text: Text) {
        this.text = text;
        this.text.runtimeProps.editing = true;
        this.text.runtimeProps.drawSelection = true;
        //todo: ctxl

        var inlineEditor = new InlineTextEditor();
        inlineEditor.onInvalidate = this.invalidateLayers;
        inlineEditor.onSelectionChanged = () => { };
        inlineEditor.onDeactivated = finalEdit => this.endEdit(finalEdit);
        inlineEditor.activate(this.text.globalViewMatrix(), this.text.engine(), this.text.props.font, this.app.fontManager);

        this.editor = inlineEditor;
        Environment.controller.inlineEditModeChanged.raise(true, inlineEditor);
    }

    private endEdit(finalEdit: boolean) {
        this.text.runtimeProps.engine.unsubscribe();
        this.text.runtimeProps.editing = false;
        this.text.runtimeProps.drawSelection = false;
        //this.text.runtimeProps.ctxl = undefined;
        Environment.controller.inlineEditModeChanged.raise(false, null);

        this.editor = null;
        this.text = null;
    }

    private invalidateLayers = () => {
        Environment.view.page.invalidate();
        this.text.invalidate();
    }

    dispose() {
        this.dragController.unbind();
        this.tokens.forEach(x => x.dispose());
        this.tokens.length = 0;
    }
}