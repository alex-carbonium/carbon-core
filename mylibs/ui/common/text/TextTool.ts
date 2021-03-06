//TODO: edit templated elements
//TODO: auto-font-height feature for auto-width texts
//TODO: strikethrough is too high due to too high ascent, why?

import Tool from "../Tool";
import DragController from "../../../framework/DragController";
import Text from "../../../framework/text/Text";
import Font from "../../../framework/Font";
import { TextEditor } from "../../../framework/text/TextEditor";
import SharedColors from "../../SharedColors";
import DefaultFormatter from "./DefaultFormatter";
import RangeFormatter from "./RangeFormatter";
import Selection from "../../../framework/SelectionModel";
import Cursor from "../../../framework/Cursor";
import Invalidate from "../../../framework/Invalidate";
import { getAverageLuminance } from "../../../math/color";
import Rect from "../../../math/rect";
import { IController, IMouseEventData, VerticalConstraint, HorizontalConstraint, IDisposable, TextMode, IRect, TextAlign, IUIElement, IView, IApp } from "carbon-core";
import UserSettings from "../../../UserSettings";
import Point from "../../../math/point";
import Symbol from "../../../framework/Symbol";
import BoundaryPathDecorator from "../../../decorators/BoundaryPathDecorator";

const CursorInvertThreshold = .4;
const UpdateTimeout = 1000;

export default class TextTool extends Tool {
    private globalTokens: IDisposable[] = [];
    private editorTokens: IDisposable[] = [];
    private text: Text;
    /**
     * Contains the most recent boundary rect since content is not always immediately updated.
     */
    private boundaryRect: IRect = Rect.Zero;
    private updateTimer: number = 0;

    private _rangeFormatter: RangeFormatter = null;
    private _defaultFormatter: DefaultFormatter = null;
    private _editor: TextEditor;
    private _dragZone: any;
    private _next: { element: Text, event: IMouseEventData };
    private _detaching: boolean;
    private _backgroundCache: object;
    private _dragController: DragController;
    private _onAttached: any;
    private _onElementSelectedToken: IDisposable;
    private _drawBinding: IDisposable;

    constructor(app: IApp, view: IView, controller: IController) {
        super("textTool", app, view, controller);
        this._editor = null;
        this.text = null;
        this._dragZone = null;
        this._next = null;
        this._detaching = false;
        this._defaultFormatter = null;
        this._rangeFormatter = null;
        this._backgroundCache = null;

        this._dragController = new DragController();
        this._dragController.onClicked = this.onClicked;
        this._dragController.onSearching = this.onDragSearching;
        this._dragController.onStarting = this.onDragStarting;
        this._dragController.onDragging = this.onDragging;
        this._dragController.onStopped = this.onDragStopped;

        this.globalTokens.push(controller.dblclickEvent.bind(this, this.onDblClickEvent));
        this.globalTokens.push(controller.onElementDblClicked.bind(this, this.onDblClickElement));
        this.globalTokens.push(this.app.actionManager.subscribe("enter", this.onEditTextAction));

        this._onAttached = null;
    }

    attach() {
        this._detaching = false;
        this._dragController.bindToController(this.controller);
        this._onElementSelectedToken = Selection.onElementSelected.bind(this, this.onElementSelected);
        this._defaultFormatter = new DefaultFormatter();
        this._defaultFormatter.initFormatter(this.app);
        Selection.requestProperties([this._defaultFormatter]);
        Cursor.setGlobalCursor("text_tool");

        if (this._onAttached) {
            this._onAttached();
            this._onAttached = null;
        }

        if (this.view.interactionLayer) {
            this._drawBinding = this.view.interactionLayer.ondraw.bindHighPriority(this, this.layerdraw);
        }

        this.controller.currentTool = "textTool";
    }

    detach() {
        super.detach();
        if (this._drawBinding) {
            this._drawBinding.dispose();
            this._drawBinding = null;
        }
        Cursor.removeGlobalCursor();

        if (this._onElementSelectedToken) {
            this._onElementSelectedToken.dispose();
            this._onElementSelectedToken = null;
        }

        this._dragController.unbind();
        if (this._editor) {
            Selection.makeSelection([this.text], "new", false, true);
            this._editor.deactivate(false);
        }

        this._backgroundCache = null;
        this._dragZone = null;

        Cursor.removeGlobalCursor();
    }

    dispose() {
        this.globalTokens.forEach(x => x.dispose());
        this.globalTokens.length = 0;

        super.dispose();
    }

    onElementSelected(selection) {
        if (selection.count()) {
            //handle events after active frame
            this._dragController.unbind();
            this._dragController.bindToController(this.controller);
        }
    }
    onEditTextAction = () => {
        let text = this.tryGetSupportedElement();
        if (text) {
            text.disableRenderCaching(true);
            if (this.controller.currentTool !== "textTool") {
                this._onAttached = () => { this.beginEdit(text); };
                this.app.actionManager.invoke("textTool");
            }
            else {
                this.beginEdit(text);
            }
        }
    };

    onDragSearching = (e: IMouseEventData) => {
        if (this._hittingEdited(e)) {
            e.cursor = "text";
            return;
        }
        var hit = this._hitNewElement(e);
        if (hit instanceof Text && hit !== this.text) {
            this._next = { element: hit, event: e };
            Cursor.setGlobalCursor("text");
            Invalidate.requestInteractionOnly();
        }
        else {
            if (this._next) {
                this._next = null;
                Invalidate.requestInteractionOnly();
            }
            if (this._editor && !UserSettings.text.insertNewOnClickOutside) {
                Cursor.removeGlobalCursor();
            }
            else {
                Cursor.setGlobalCursor("text_tool");
            }
        }
    };
    onDragStarting = e => {
        if (this._hittingEdited(e)) {
            if (!e.shiftKey) { //not to interfere with shift+click selection
                this._editor.mouseDown(e);
            }
        }
        else if (this._editor) {
            var hit = this._hitNewElement(e);
            if (hit instanceof Text) {
                this._next = { element: hit, event: e };
            }
            this._editor.deactivate(!UserSettings.text.insertNewOnClickOutside);
        }
        else {
            this._dragZone = { x: e.x, y: e.y, width: 0, height: 0, flipX: false, flipY: false };
        }
        Invalidate.requestInteractionOnly();
    };
    onDragging = (e, dx, dy) => {
        if (this._editor) {
            this._editor.mouseMove(e);
        }
        else if (this._dragZone) {
            this._dragZone.width = Math.abs(dx);
            this._dragZone.height = Math.abs(dy);
            this._dragZone.flipX = dx < 0;
            this._dragZone.flipY = dy < 0;
        }

        Invalidate.requestInteractionOnly();
    };
    onDragStopped = e => {
        if (this._editor) {
            this._editor.mouseUp(e);
        }
        else if (this._dragZone) {
            var rect = this._getDrawRect(this._dragZone);
            var props: any = { br: rect.withPosition(0, 0).roundMutable() };
            props.mode = TextMode.Block;
            this.insertText({ x: rect.x, y: rect.y }, props, true);
            this._dragZone = null;
        }
        Invalidate.requestInteractionOnly();
    };
    onClicked = (e: IMouseEventData) => {
        if (this._hittingEdited(e)) {
            this._editor.mouseDown(e, e["event"]);
            this._editor.mouseUp(e);
        }
        else {
            var hit = this._hitNewElement(e);
            if (hit instanceof Text) {
                this.beginEdit(hit, e);
            }
            else if (this._editor) {
                Selection.makeSelection([this.text], "new", false, true);
                this._editor.deactivate(UserSettings.text.insertNewOnClickOutside);
            }
            else if (UserSettings.text.insertNewOnClickOutside || !this._detaching) { //tool can be changed by mouse down
                this.insertText(e, { mode: TextMode.Label });
            }
        }
        e.handled = true;
    };
    //occurs early to handle the element which is currently edited
    onDblClickEvent = (e: IMouseEventData) => {
        if (this._hittingEdited(e)) {
            this._editor.mouseDown(e);
            this._editor.mouseUp(e);
            this._editor.mouseDblClick(e);
            e.handled = true;
        }
    }
    //occurs in the end to start editing dblclicked element
    onDblClickElement = (e: IMouseEventData, element: IUIElement) => {
        var hit = element;
        if (hit instanceof Text && this.controller.currentTool !== "textTool") {
            this._onAttached = () => { this.beginEdit(hit as Text, e); };
            this.app.actionManager.invoke("textTool");
            e.handled = true;
        }
    };

    insertText(e, p = {}, fixedSize?: boolean) {
        var text = new Text();
        this.app.activePage.nameProvider.assignNewName(text);

        var props = {
            content: UserSettings.text.defaultText,
            font: this._defaultFormatter.props.font
        };
        if (p) {
            Object.assign(props, p);
        }

        text.prepareAndSetProps(props);
        var y = e.y;
        if (!fixedSize) {
            var adapter = text.adapter();
            var height = adapter.getActualHeight();
            y -= height / 2;
        }
        text.applyTranslation(Point.create(e.x, y).roundMutable());
        this.view.dropElement(text);

        this.app.activePage.nameProvider.assignNewName(text);

        Selection.makeSelection([text], "new", false, true);
        this.beginEdit(text);
    }

    beginEdit(text: Text, e?, selectText = UserSettings.text.selectOnDblClick) {
        if (this._editor) {
            this._editor.deactivate(false);
        }

        this.text = text;
        this.text.disableRenderCaching(true);

        var adapter = text.adapter();
        //unsubscribed in adapter.unsubscribe()
        adapter.contentChanged().bind(this.contentChanged);

        this._rangeFormatter = new RangeFormatter();
        this._rangeFormatter.initFormatter(this.app, adapter, text);
        Selection.requestProperties([this._rangeFormatter]);
        Selection.hideFrame(true);

        this._editor = this._createEditor(adapter, text);
        this.boundaryRect = text.boundaryRect();

        text.runtimeProps.editing = true;
        text.runtimeProps.drawSelection = true;
        text.runtimeProps.ctxl = 2;

        if (e && !selectText) {
            e.y -= text.getVerticalOffset(adapter);
            this._editor.mouseDown(e);
            this._editor.mouseUp(e);
        }
        else {
            adapter.select(0, adapter.getLength() - 1);
        }

        Cursor.setGlobalCursor("text");
        this.invalidateLayers();
        this.controller.inlineEditModeChanged.raise(true, this._editor);

        this._next = null;
    }
    contentChanged = () => {
        let adapter = this._editor.adapter;
        let actualWidth = adapter.getActualWidth();
        let actualHeight = adapter.getActualHeight();
        let constraints = this.text.constraints();
        let font = this.text.font();
        let br = this.text.boundaryRect();

        let canMove = font.align === TextAlign.right
            || font.align === TextAlign.center
            || font.valign === TextAlign.bottom
            || font.valign === TextAlign.middle;
        let canAutoGrow = !this.text.props.wrap && (constraints.h === HorizontalConstraint.LeftRight
            || constraints.v === VerticalConstraint.TopBottom);

        let overflow = actualWidth > br.width || actualHeight > br.height;
        let isLabel = this.text.props.mode === TextMode.Label;
        let autoGrowing = overflow && canAutoGrow;
        let moving = (overflow || isLabel) && canMove;

        if (autoGrowing || moving) {
            this.text.prepareAndSetProps({ content: adapter.save() });

            if (this.updateTimer) {
                clearTimeout(this.updateTimer);
                this.updateTimer = 0;
            }
        }
        else {
            if (this.updateTimer) {
                clearTimeout(this.updateTimer);
            }
            this.updateTimer = setTimeout(this.updateOriginalDebounced, UpdateTimeout);
        }

        // Height is kept as actual since vertical offset is handled by translating the entire adapter.
        // When position is affected by the width, document layout needs to be recalculated.
        let newBr = this.text.boundaryRect();
        if (newBr.width !== adapter.getWidth() && (autoGrowing || moving)) {
            adapter.updateSize(newBr.width, actualHeight);
            adapter.getDocument().layout();
        }
        else if (!this.text.props.wrap) {
            let maxWidth = adapter.getActualWidthWithoutWrap();
            let relayout = maxWidth > adapter.getWidth();
            adapter.updateSize(Math.max(maxWidth, adapter.getWidth()), actualHeight);
            if (relayout) {
                adapter.getDocument().layout();
            }
        }
        else {
            adapter.updateSize(adapter.getWidth(), actualHeight);
        }

        if (this.text.props.mode === TextMode.Label) {
            this.boundaryRect = this.boundaryRect.withSize(actualWidth, actualHeight);
        }
        else {
            this.boundaryRect = this.boundaryRect.withSize(Math.max(actualWidth, br.width), Math.max(actualHeight, br.height));
        }
    }
    updateOriginalDebounced = () => {
        this.text.prepareAndSetProps({ content: this._editor.adapter.save() });
        this.updateTimer = 0;
    }
    endEdit(finalEdit: boolean) {
        if (this.updateTimer) {
            clearTimeout(this.updateTimer);
            this.updateTimer = 0;
            this.updateOriginalDebounced();
        }

        this.copyDocumentRangeFont();
        this.text.disableRenderCaching(false);
        this.text.runtimeProps.adapter.unsubscribe();
        this.text.runtimeProps.editing = false;
        this.text.runtimeProps.drawSelection = false;
        this.text.runtimeProps.ctxl = undefined;
        this.text.resetAdapter();

        Selection.makeSelection([this.text], "new", false, true);
        Selection.showFrame();

        this.editorTokens.forEach(x => x.dispose());
        this.editorTokens.length = 0;
        this._editor = null;
        this.text = null;
        this._rangeFormatter = null;
        this._backgroundCache = null;

        var next = this._next;
        if (next) {
            this._next = null;
            this.beginEdit(next.element, next.event, false);
        }
        else if (finalEdit) {
            this._detaching = true;
            setTimeout(() => this.controller.resetCurrentTool());
        }
        if (!next) {
            this.controller.inlineEditModeChanged.raise(false, null);
        }
    }
    copyDocumentRangeFont() {
        let range = this._editor.adapter.getDocumentRange();
        let fontExtension = null;
        let rangeFormatting = range.getFormatting();
        for (let prop in rangeFormatting) {
            if (prop === "text") {
                continue;
            }
            let value = rangeFormatting[prop];
            if (value !== undefined && value !== this.text.props.font[prop]) {
                fontExtension = fontExtension || {};
                fontExtension[prop] = value;
            }
        }

        if (fontExtension) {
            var newFont = Font.extend(this.text.props.font, fontExtension);
            this.text.prepareAndSetProps({ font: newFont });
        }
    }

    _createEditor(adapter, element) {
        var inlineEditor = new TextEditor();
        this.editorTokens.push(inlineEditor.onInvalidate.bind(this.invalidateLayers));
        this.editorTokens.push(inlineEditor.onRangeFormattingChanged.bind(this._rangeFormatter.onRangeFormattingChanged));
        this.editorTokens.push(inlineEditor.onSelectionChanged.bind(this._onSelectionChanged));
        this.editorTokens.push(inlineEditor.onDeactivated.bind(finalEdit => this.endEdit(finalEdit)));
        inlineEditor.activate(element.globalViewMatrix(), adapter, element.props.font, this.app.fontManager);
        return inlineEditor;
    }
    private invalidateLayers = () => {
        Invalidate.requestInteractionOnly();
        this.text.invalidate();
    }

    _hitNewElement(e) {
        return e.view.hitElementDirect(e)
    }
    _hittingEdited(e) {
        if (!this._editor) {
            return false;
        }
        return this.text.hitTest(e, e.view);
    }
    private tryGetSupportedElement() {
        var selection = Selection.elements;
        if (selection.length === 1) {
            let element = selection[0];
            if (element instanceof Text) {
                return element;
            }
            if (element instanceof Symbol) {
                var texts = element.findTexts();
                if (texts.length) {
                    return texts[0] as Text;
                }
            }
        }
        return null;
    };

    _onSelectionChanged = () => {
        var adapter = this._editor.adapter;
        var selection = adapter.getSelection();
        if (selection.start === selection.end) {
            if (!this._backgroundCache) {
                this._backgroundCache = {};
            }
            var color = this._backgroundCache[selection.start];
            if (color === undefined) {
                color = this._pickCaretColor(adapter, selection);
                this._backgroundCache[selection.start] = color;
            }
            adapter.caretColor(color);
        }
    };
    //does not support rotation, can be added later if needed
    _pickCaretColor(adapter, selection) {
        var coords = adapter.getCaretCoords(selection.start);
        var global = this.text.getBoundaryRectGlobal();
        var x = (coords.l + global.x) * this.view.scale() - this.view.scrollX + .5 | 0;
        var y = (coords.t + global.y) * this.view.scale() - this.view.scrollY + .5 | 0;
        var contextScale = this.view.contextScale;
        var background = this.view.context.getImageData(
            x * contextScale - 1,
            y * contextScale,
            coords.w * contextScale + 2.5 | 0,
            coords.h * contextScale + .5 | 0);

        var luminance = getAverageLuminance(background);
        if (luminance !== -1) {
            return luminance < CursorInvertThreshold ? "white" : "black";
        }
        return "black";
    }

    layerdraw(context) {
        if (this._dragZone && this._dragZone.width > 1) {
            context.save();

            var r = this._getDrawRect(this._dragZone);
            context.strokeStyle = SharedColors.Highlight;
            context.lineWidth = 1 / this.view.scale();
            context.strokeRect(r.x + .5, r.y + .5, r.width - 1, r.height - 1);
            context.restore();
        }
        if (this.text) {
            context.save();
            context.beginPath();
            BoundaryPathDecorator.drawRectAsPath(context, this.boundaryRect, this.text.globalViewMatrix());
            context.strokeStyle = SharedColors.Highlight;
            context.stroke();
            context.restore();
        }
        if (this._next) {
            BoundaryPathDecorator.highlight(this.view, context, this._next.element);
        }
    }
    _getDrawRect(zone) {
        if (!zone.flipX && !zone.flipY) {
            return Rect.fromObject(zone);
        }

        var x = zone.x;
        var y = zone.y;
        if (this._dragZone.flipX) {
            x -= this._dragZone.width;
        }
        if (this._dragZone.flipY) {
            y -= this._dragZone.height;
        }
        return new Rect(x, y, zone.width, zone.height);
    }
}
