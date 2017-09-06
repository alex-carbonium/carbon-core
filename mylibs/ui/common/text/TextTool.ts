//TODO: edit templated elements
//TODO: auto-font-height feature for auto-width texts
//TODO: strikethrough is too high due to too high ascent, why?

import Tool from "../Tool";
import DropVisualization from "../../../extensions/DropVisualization";
import DragController from "../../../framework/DragController";
import Text from "../../../framework/text/Text";
import TextEngine from "../../../framework/text/textengine";
import Font from "../../../framework/Font";
import Brush from "../../../framework/Brush";
import NameProvider from "../../NameProvider";
import InlineTextEditor from "../../../framework/text/inlinetexteditor";
import SharedColors from "../../SharedColors";
import DefaultFormatter from "./DefaultFormatter";
import RangeFormatter from "./RangeFormatter";
import { ViewTool } from "../../../framework/Defs";
import Selection from "../../../framework/SelectionModel";
import Cursor from "../../../framework/Cursor";
import Invalidate from "../../../framework/Invalidate";
import Environment from "../../../environment";
import { getAverageLuminance } from "../../../math/color";
import Rect from "../../../math/rect";
import { ChangeMode, IMouseEventData, IElementEventData, VerticalConstraint, HorizontalConstraint, IDisposable, TextMode, IRect } from "carbon-core";
import UserSettings from "../../../UserSettings";
import Point from "../../../math/point";
import Symbol from "../../../framework/Symbol";
import BoundaryPathDecorator from "../../../decorators/BoundaryPathDecorator";

const CursorInvertThreshold = .4;
const UpdateTimeout = 1000;

export default class TextTool extends Tool {
    [name: string]: any;
    private globalTokens: IDisposable[] = [];
    private text: Text;
    /**
     * Contains the most recent boundary rect since content is not always immediately updated.
     */
    private boundaryRect: IRect = Rect.Zero;
    private updateTimer: number = 0;

    constructor(app) {
        super(ViewTool.Text);
        this._app = app;
        this._view = Environment.view;
        this._controller = Environment.controller;
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

        this.globalTokens.push(Environment.controller.dblclickEvent.bind(this, this.onDblClickEvent));
        this.globalTokens.push(Environment.controller.onElementDblClicked.bind(this, this.onDblClickElement));
        this.globalTokens.push(this._app.actionManager.subscribe("enter", this.onEditTextAction));

        this._onAttached = null;
    }

    attach(app, view, controller) {
        this._detaching = false;
        this._dragController.bindToController(controller);
        this._onElementSelectedToken = Selection.onElementSelected.bind(this, this.onElementSelected);

        this._defaultFormatter = new DefaultFormatter();
        this._defaultFormatter.initFormatter(this._app);
        Selection.makeSelection([this._defaultFormatter]);
        Cursor.setGlobalCursor("text_tool");

        if (this._onAttached) {
            this._onAttached();
            this._onAttached = null;
        }

        if (view.interactionLayer) {
            this._drawBinding = view.interactionLayer.ondraw.bindHighPriority(this, this.layerdraw);
        }

        app.currentTool = ViewTool.Text;
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
            Selection.makeSelection([this.text]);
            this._editor.deactivate(false);
        }

        this._backgroundCache = null;
        this._dragZone = null;

        Cursor.removeGlobalCursor();
    }

    dispose() {
        this.globalTokens.forEach(x => x.dispose());
        this.globalTokens.length = 0;
    }

    onElementSelected(selection) {
        if (selection.count()) {
            //handle events after active frame
            this._dragController.unbind();
            this._dragController.bindToController(Environment.controller);
        }
    }
    onEditTextAction = () => {
        let text = this.tryGetSupportedElement();
        if (text) {
            if (this._app.currentTool !== ViewTool.Text) {
                this._onAttached = () => { this.beginEdit(text); };
                this._app.actionManager.invoke("textTool");
            }
            else {
                this.beginEdit(text);
            }
        }
    };

    onDragSearching = e => {
        if (this._hittingEdited(e)) {
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
            this._editor.mouseUp(e, e["event"]);
        }
        else {
            var hit = this._hitNewElement(e);
            if (hit instanceof Text) {
                this.beginEdit(hit, e);
            }
            else if (this._editor) {
                Selection.makeSelection([this.text]);
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
    onDblClickElement = (e: IElementEventData) => {
        var hit = e.element;
        if (hit instanceof Text && this._app.currentTool !== ViewTool.Text) {
            this._onAttached = () => { this.beginEdit(hit as Text, e); };
            this._app.actionManager.invoke("textTool");
            e.handled = true;
        }
    };

    insertText(e, p = {}, fixedSize?: boolean) {
        var text = new Text();
        this._app.activePage.nameProvider.assignNewName(text);

        var props = {
            content: UserSettings.text.defaultText,
            font: this._defaultFormatter.props.font
        };
        if (p) {
            Object.assign(props, p);
        }

        var dropData;
        if (this._view.isolationLayer.isActive) {
            dropData = this._view.isolationLayer.findDropToPageData(e.x, e.y, text);
        }
        else {
            dropData = this._app.activePage.findDropToPageData(e.x, e.y, text);
        }
        if (dropData) {
            text.prepareAndSetProps(props);
            var y = dropData.position.y;
            if (!fixedSize) {
                var engine = text.engine();
                var height = engine.getActualHeight();
                y -= height / 2;
            }
            text.applyTranslation(Point.create(dropData.position.x, y).roundMutable());
            dropData.target.add(text);
        }

        this._app.activePage.nameProvider.assignNewName(text);

        this.beginEdit(text);
    }

    beginEdit(text: Text, e?, selectText = UserSettings.text.selectOnDblClick) {
        if (this._editor) {
            this._editor.deactivate(false);
        }

        this.text = text;

        var engine = text.engine();
        engine.contentChanged(this.contentChanged);

        this._editor = this._createEditor(engine, text);
        this.boundaryRect = text.boundaryRect();

        this._rangeFormatter = new RangeFormatter();
        this._rangeFormatter.initFormatter(this._app, engine, text);
        Selection.makeSelection([this._rangeFormatter]);

        text.runtimeProps.editing = true;
        text.runtimeProps.drawSelection = true;
        text.runtimeProps.ctxl = 2;

        if (e && !selectText) {
            e.y -= text.getVerticalOffset(engine);
            this._editor.mouseDown(e);
            this._editor.mouseUp(e);
        }
        else {
            engine.select(0, engine.getLength() - 1);
        }

        Cursor.setGlobalCursor("text");
        this.invalidateLayers();
        Environment.controller.inlineEditModeChanged.raise(true, this._editor);

        this._next = null;
    }
    contentChanged = () => {
        var engine = this._editor.engine;
        var w = engine.getActualWidth() + .5 | 0;
        var h = engine.getActualHeight() + .5 | 0;
        var constraints = this.text.constraints();
        var br = this.text.boundaryRect();

        let canMove = constraints.h === HorizontalConstraint.Right
            || constraints.h === HorizontalConstraint.Center
            || constraints.v === VerticalConstraint.Bottom
            || constraints.v === VerticalConstraint.Center;
        let canAutoGrow = constraints.h === HorizontalConstraint.LeftRight
            || constraints.v === VerticalConstraint.TopBottom;

        let expanding = (w > br.width || h > br.height) && (canAutoGrow || canMove);
        let changingMatrix = this.text.props.mode === TextMode.Label && canMove;

        if (expanding || changingMatrix) {
            this.text.prepareAndSetProps({ content: engine.save() });
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

        //the engine must keep current width (for example, for right alignment)
        //and update the actual height so that the lines added below are not clipped
        engine.updateSize(engine.getWidth(), h);

        if (this.text.props.mode === TextMode.Label) {
            this.boundaryRect = this.boundaryRect.withSize(w, h);
        }
        else {
            this.boundaryRect = this.boundaryRect.withSize(Math.max(w, br.width), Math.max(h, br.height));
        }
    }
    updateOriginalDebounced = () => {
        this.text.prepareAndSetProps({ content: this._editor.engine.save() });
        this.updateTimer = 0;
    }
    endEdit(finalEdit: boolean) {
        if (this.updateTimer) {
            clearTimeout(this.updateTimer);
            this.updateTimer = 0;
            this.updateOriginalDebounced();
        }

        this.text.runtimeProps.engine.unsubscribe();
        this.text.runtimeProps.editing = false;
        this.text.runtimeProps.drawSelection = false;
        this.text.runtimeProps.ctxl = undefined;
        this.text.resetEngine();

        Selection.makeSelection([this.text]);

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
            setTimeout(() => this._app.resetCurrentTool());
        }
        if (!next) {
            Environment.controller.inlineEditModeChanged.raise(false, null);
        }
    }

    _createEditor(engine, element) {
        var inlineEditor = new InlineTextEditor();
        inlineEditor.onInvalidate = this.invalidateLayers;
        inlineEditor.onSelectionChanged = this._onSelectionChanged;
        inlineEditor.onDeactivated = finalEdit => this.endEdit(finalEdit);
        inlineEditor.activate(element.globalViewMatrix(), engine, element.props.font, this._app.fontManager);
        return inlineEditor;
    }
    private invalidateLayers = () => {
        Invalidate.requestInteractionOnly();
        this.text.invalidate();
    };

    _hitNewElement(e) {
        return this._view.hitElementDirect(e)
    }
    _hittingEdited(e) {
        if (!this._editor) {
            return false;
        }
        return this.text.hitTest(e, this._view.scale());
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
        var engine = this._editor.engine;
        var selection = engine.getSelection();
        if (selection.start === selection.end) {
            if (!this._backgroundCache) {
                this._backgroundCache = {};
            }
            var color = this._backgroundCache[selection.start];
            if (color === undefined) {
                color = this._pickCaretColor(engine, selection);
                this._backgroundCache[selection.start] = color;
            }
            engine.caretColor(color);
        }
    };
    //does not support rotation, can be added later if needed
    _pickCaretColor(engine, selection) {
        var coords = engine.getCaretCoords(selection.start);
        var global = this.text.getBoundaryRectGlobal();
        var x = (coords.l + global.x) * this._view.scale() - this._view.scrollX() + .5 | 0;
        var y = (coords.t + global.y) * this._view.scale() - this._view.scrollY() + .5 | 0;
        var contextScale = this._view.contextScale;
        var background = this._view.context.getImageData(
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
            context.lineWidth = 1 / this._view.scale();
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
            BoundaryPathDecorator.draw(context, this._next.element);
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
