import { IApp, IMouseEventData, IController, IDisposable, ChangeMode, ITextProps, TextInputArgs } from "carbon-core";
import {InlineTextEditor} from "./text/inlinetexteditor";
import Text from "./text/Text";
import Invalidate from "./Invalidate";
import UIElement from "./UIElement";
import DragController from "./DragController";
import Cursor from "./Cursor";

export class PreviewTextTool {
    private tokens: IDisposable[] = [];
    private editorTokens: IDisposable[] = [];
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
        if (hit !== this.text && this.isEditableText(hit)) {
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
        if (this.isEditableText(hit)) {
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
        return this.text.hitTest(e, e.view);
    }

    private hitNewElement(e) {
        return e.view.hitElementDirect(e);
    }

    private isEditableText(element: UIElement) {
        return element instanceof Text && element.props.editable;
    }

    private createEditor(text: Text) {
        this.text = text;
        this.text.runtimeProps.editing = true;
        this.text.runtimeProps.drawSelection = true;
        this.text.enablePropsTracking();
        //todo: ctxl

        let engine = this.text.engine();
        //unsubscribed in engine.unsubscribe()
        engine.contentChanged().bind(this.onContentChanged);

        var inlineEditor = new InlineTextEditor();
        this.editorTokens.push(inlineEditor.onInvalidate.bind(this.invalidateLayers));
        this.editorTokens.push(inlineEditor.onDeactivated.bind(finalEdit => this.endEdit(finalEdit)));
        inlineEditor.activate(this.text.globalViewMatrix(), engine, this.text.props.font, this.app.fontManager);

        this.editor = inlineEditor;
        this.controller.inlineEditModeChanged.raise(true, inlineEditor);
    }

    private onContentChanged = () => {
        this.text.prepareAndSetProps({ content: this.editor.engine.save() }, ChangeMode.Self);

        if (this.text.runtimeProps.events && this.text.runtimeProps.events.onTextInput) {
            let args: TextInputArgs = {
                plainText: this.text.engine().getDocumentRange().plainText(),
                content: this.text.props.content
            }
            this.text.runtimeProps.events.onTextInput.raise(args);
        }
    }

    private endEdit(finalEdit: boolean) {
        this.text.runtimeProps.engine.unsubscribe();
        this.text.runtimeProps.editing = false;
        this.text.runtimeProps.drawSelection = false;
        this.text.disablePropsTracking();

        this.controller.inlineEditModeChanged.raise(false, null);

        this.editorTokens.forEach(x => x.dispose());
        this.editorTokens.length = 0;
        this.editor = null;
        this.text = null;
    }

    private invalidateLayers = () => {
        Invalidate.request();
        this.text.invalidate();
        this.text.clearRenderingCache();
    }

    dispose() {
        this.dragController.unbind();
        this.tokens.forEach(x => x.dispose());
        this.tokens.length = 0;
    }
}