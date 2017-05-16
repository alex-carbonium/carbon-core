//TODO: edit templated elements
//TODO: auto-font-height feature for auto-width texts
//TODO: strikethrough is too high due to too high ascent, why?

import Tool from "../Tool";
import DropVisualization from "../../../extensions/DropVisualization";
import DragController from "../../../framework/DragController";
import Text from "../../../framework/text/Text";
import Font from "../../../framework/Font";
import Brush from "../../../framework/Brush";
import NameProvider from "../../NameProvider";
import InlineTextEditor from "../../../framework/text/inlinetexteditor";
import SharedColors from "../../SharedColors";
import DefaultFormatter from "./DefaultFormatter";
import RangeFormatter from "./RangeFormatter";
import {ViewTool} from "../../../framework/Defs";
import Selection from "../../../framework/SelectionModel";
import Cursor from "../../../framework/Cursor";
import Invalidate from "../../../framework/Invalidate";
import Environment from "../../../environment";
import {getAverageLuminance} from "../../../math/color";
import Rect from "../../../math/rect";
import { ChangeMode, IMouseEventData, IElementEventData } from "carbon-core";
import UserSettings from "../../../UserSettings";
import Point from "../../../math/point";

const CursorInvertThreshold = .4;

export default class TextTool extends Tool {
    [name: string]: any;

    constructor(app) {
        super(ViewTool.Text);
        this._app = app;
        this._view = Environment.view;
        this._controller = Environment.controller;
        this._editor = null;
        this._editedElement = null;
        this._editClone = null;
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

        this._dblclickEventToken = Environment.controller.onElementDblClicked.bind(this, this.onDblClick);
        this._editTextToken = this._app.actionManager.subscribe("enter", this.onEditTextAction);

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

        if (this._onAttached){
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
        if(this._drawBinding){
            this._drawBinding.dispose();
            this._drawBinding = null;
        }
        Cursor.removeGlobalCursor();
        Selection.onElementSelected.unbind(this, this.onElementSelected);
        this._dragController.unbind();
        if (this._editor){
            Selection.makeSelection([this._editedElement]);
            this._editor.deactivate(false);
        }

        if(this._onElementSelectedToken){
            this._onElementSelectedToken.dispose();
            this._onElementSelectedToken = null;
        }

        this._backgroundCache = null;
        this._dragZone = null;

        Cursor.removeGlobalCursor();
    }

    dispose(){
        if(this._dblclickEventToken){
            this._dblclickEventToken.dispose();
            this._dblclickEventToken = null;
        }

        if(this._editTextToken){
            this._editTextToken.dispose();
            this._editTextToken = null;
        }
    }

    onElementSelected(selection){
        if (selection.count()){
            //handle events after active frame
            this._dragController.unbind();
            this._dragController.bindToController(Environment.controller);
        }
    }
    onEditTextAction = () => {
        if (this._canEditSelectedElement()){
            var text = Selection.selectComposite().elementAt(0);
            if (this._app.currentTool !== ViewTool.Text){
                this._onAttached = () => {this.beginEdit(text);};
                this._app.actionManager.invoke("textTool");
            }
            else{
                this.beginEdit(text);
            }
        }
    };

    onDragSearching = e => {
        if (this._hittingEdited(e)){
            return;
        }
        var hit = this._hitNewElement(e);
        if (hit instanceof Text && hit !== this._editedElement){
            this._next = {element: hit, event: e};
            Cursor.setGlobalCursor("text");
            Invalidate.requestInteractionOnly();
        }
        else {
            if (this._next){
                this._next = null;
                Invalidate.requestInteractionOnly();
            }
            if (this._editor && !UserSettings.text.insertNewOnClickOutside){
                Cursor.removeGlobalCursor();
            }
            else{
                Cursor.setGlobalCursor("text_tool");
            }
        }
    };
    onDragStarting = e => {
        if (this._hittingEdited(e)){
            if (!e.shiftKey){ //not to interfere with shift+click selection
                this._editor.mouseDown(e);
            }
        }
        else if (this._editor){
            var hit = this._hitNewElement(e);
            if (hit instanceof Text){
                this._next = {element: hit, event: e};
            }
            this._editor.deactivate(!UserSettings.text.insertNewOnClickOutside);
        }
        else{
            this._dragZone = {x: e.x, y: e.y, width: 0, height: 0, flipX: false, flipY: false};
        }
        Invalidate.requestInteractionOnly();
    };
    onDragging = (e, dx, dy) => {
        if (this._editor){
            this._editor.mouseMove(e);
        }
        else if (this._dragZone){
            this._dragZone.width = Math.abs(dx);
            this._dragZone.height = Math.abs(dy);
            this._dragZone.flipX = dx < 0;
            this._dragZone.flipY = dy < 0;
        }

        Invalidate.requestInteractionOnly();
    };
    onDragStopped = e => {
        if (this._editor){
            this._editor.mouseUp(e);
        }
        else if (this._dragZone){
            var rect = this._getDrawRect(this._dragZone);
            var props: any = {br: rect.withPosition(0, 0).roundMutable()};
            props.autoWidth = false;
            this.insertText({x: rect.x, y: rect.y}, props, true);
            this._dragZone = null;
        }
        Invalidate.requestInteractionOnly();
    };
    onClicked = (e: IMouseEventData) => {
        if (this._hittingEdited(e)){
            this._editor.mouseDown(e, e["event"]);
            this._editor.mouseUp(e, e["event"]);
        }
        else{
            var hit = this._hitNewElement(e);
            if (hit instanceof Text){
                this.beginEdit(hit, e);
            }
            else if (this._editor){
                Selection.makeSelection([this._editedElement]);
                this._editor.deactivate(UserSettings.text.insertNewOnClickOutside);
            }
            else if (UserSettings.text.insertNewOnClickOutside || !this._detaching){ //tool can be changed by mouse down
                this.insertText(e);
            }
        }
        e.handled = true;
    };
    onDblClick = (e: IElementEventData) => {
        if (this._hittingEdited(e)){
            this._editor.mouseDown(e);
            this._editor.mouseUp(e);
            this._editor.mouseDblClick(e);
            e.handled = true;
        }
        else{
            var hit = e.element;
            if (hit instanceof Text && this._app.currentTool !== ViewTool.Text){
                this._onAttached = () => {this.beginEdit(hit, e);};
                this._app.actionManager.invoke("textTool");
                e.handled = true;
            }
        }
    };

    insertText(e, p = {}, fixedSize?: boolean){
        var text = new Text();
        this._app.activePage.nameProvider.assignNewName(text);

        var props = {
            content: UserSettings.text.defaultText,
            font: this._defaultFormatter.props.font
        };
        if (p){
            Object.assign(props, p);
        }

        var dropData;
        if (this._view.isolationLayer.isActive) {
            dropData = this._view.isolationLayer.findDropToPageData(e.x, e.y, text);
        }
        else {
            dropData = this._app.activePage.findDropToPageData(e.x, e.y, text);
        }
        if (dropData){
            text.prepareAndSetProps(props);
            var y = dropData.position.y;
            if (!fixedSize){
                var engine = text.createEngine();
                var height = engine.getActualHeight();
                y -= height/2;
            }
            text.applyTranslation(Point.create(dropData.position.x, y).roundMutable());
            dropData.target.add(text);
        }

        this._app.activePage.nameProvider.assignNewName(text);

        this.beginEdit(text);
    }

    beginEdit(text, e?, selectText = UserSettings.text.selectOnDblClick){
        if (this._editor){
            this._editor.deactivate(false);
        }

        var clone = text.clone();
        clone.setProps(text.selectLayoutProps(true), ChangeMode.Self);
        clone.runtimeProps.drawSelection = true;
        clone.runtimeProps.originalHeight = text.height();

        text.runtimeProps.drawText = false;
        text.runtimeProps.sampleBackground = this.sampleBackground;
        Invalidate.request(0);

        var engine = clone.createEngine();
        engine.contentChanged(this.contentChanged);
        this._editor = this._createEditor(engine, clone);
        this._editedElement = text;
        this._editClone = clone;
        this._editClone.runtimeProps.keepEngine = true;

        this._rangeFormatter = new RangeFormatter();
        this._rangeFormatter.initFormatter(this._app, engine, this._editClone, () => this._changed = true);
        Selection.makeSelection([this._rangeFormatter]);

        if (e && !selectText){
            e.y -= text.getVerticalOffset(engine);
            this._editor.mouseDown(e);
            this._editor.mouseUp(e);
        }
        else{
            engine.select(0, engine.getLength() - 1);
        }

        this._view.interactionLayer.add(clone);
        Cursor.setGlobalCursor("text");
        Invalidate.request();
        Environment.controller.inlineEditModeChanged.raise(true, this._editor);

        this._changed = false;
        this._next = null;
    }
    contentChanged = () => {
        var engine = this._editor.engine;
        var w = engine.getActualWidth() + .5|0;
        var h = engine.getActualHeight() + .5|0;
        var props = null;
        if (w > this._editClone.width() || this._editClone.props.autoWidth){
            props = props || {};
            props.width = w;
        }
        if (h >= this._editClone.runtimeProps.originalHeight){
            props = props || {};
            props.height = h;
        }
        if (props){
            this._editClone.setProps(props, ChangeMode.Self);
            //this._editor.engine.updateSize(this._editClone.width(), this._editClone.height());
            this._resizeBackgroundIfNeeded();
        }
        this._changed = true;
    };
    endEdit(finalEdit: boolean){
        if (this._changed){
            this._updateOriginal();
        }
        delete this._editedElement.runtimeProps.engine;
        delete this._editedElement.runtimeProps.drawText;

        Selection.makeSelection([this._editedElement]);

        this._editor = null;
        this._editedElement = null;
        this._view.interactionLayer.remove(this._editClone);
        this._editClone = null;
        this._rangeFormatter = null;
        this._backgroundCache = null;
        this._changed = false;

        var next = this._next;
        if (next){
            this._next = null;
            this.beginEdit(next.element, next.event, false);
        }
        else if (finalEdit) {
            this._detaching = true;
            setTimeout(() => this._app.resetCurrentTool());
        }
        Environment.controller.inlineEditModeChanged.raise(false, null);
    }
    _updateOriginal(){
        var props = Object.assign({}, this._editClone.selectLayoutProps(true));
        props.m = this._editedElement.parent().globalViewMatrixInverted().appended(props.m);
        if (props.m.equals(this._editedElement.viewMatrix())){
            delete props.m;
        }

        props.content = this._editor.engine.save();
        props.font = this._rangeFormatter.getFirstFont();

        if (this._editClone.props.font.valign !== this._editedElement.props.font.valign){
            props.font = Font.extend(props.font, {valign: this._editClone.props.font.valign});
        }

        this._editedElement.prepareAndSetProps(props); //no validation, save from clone as is
    }

    _createEditor(engine, element){
        var inlineEditor = new InlineTextEditor();
        inlineEditor.onInvalidate = this._onInvalidateEditor;
        inlineEditor.onSelectionChanged = this._onSelectionChanged;
        inlineEditor.onDeactivated = finalEdit => this.endEdit(finalEdit);
        inlineEditor.activate(element.viewMatrix(), engine, element.props.font, this._app.fontManager);
        return inlineEditor;
    }
    _onInvalidateEditor = () => {
        Invalidate.requestInteractionOnly();
    };

    _hitNewElement(e){
        return this._view.hitElementDirect(e)
    }
    _hittingEdited(e){
        if (!this._editClone){
            return false;
        }
        return this._editClone.hitTest(e, this._view.scale());
    }
    _canEditSelectedElement = () => {
        var selection = Selection.selectComposite();
        if (selection.count() === 1 && selection.elementAt(0) instanceof Text){
            return true;
        }
        return false;
    };

    _onSelectionChanged = () => {
        var engine = this._editor.engine;
        var selection = engine.getSelection();
        if (selection.start === selection.end){
            if (!this._backgroundCache){
                this._backgroundCache = {};
            }
            var color = this._backgroundCache[selection.start];
            if (color === undefined){
                color = this._pickCaretColor(engine, selection);
                this._backgroundCache[selection.start] = color;
            }
            engine.caretColor(color);
        }
    };
    //does not support rotation, can be added later if needed
    _pickCaretColor(engine, selection){
        var coords = engine.getCaretCoords(selection.start);
        var global = this._editedElement.getBoundaryRectGlobal();
        var x = (coords.l + global.x)*this._view.scale() - this._view.scrollX() + .5|0;
        var y = (coords.t + global.y)*this._view.scale() - this._view.scrollY() + .5|0;
        var contextScale = this._view.contextScale;
        var background = this._view.context.getImageData(
            x*contextScale - 1,
            y*contextScale,
            coords.w*contextScale + 2.5|0,
            coords.h*contextScale + .5|0);

        var luminance = getAverageLuminance(background);
        if (luminance !== -1){
            return luminance < CursorInvertThreshold ? "white" : "black";
        }
        return "black";
    }
    _resizeBackgroundIfNeeded(){
        if (this._editedElement.fill() === Brush.Empty && this._editedElement.stroke() === Brush.Empty){
            return;
        }
        if (this._editedElement.width() === this._editClone.width() && this._editedElement.height() === this._editClone.height()){
            return;
        }
        this._editedElement.setProps({width: this._editClone.width(), height: this._editClone.height()});
        Invalidate.request();
    }

    layerdraw(context){
        if (this._dragZone && this._dragZone.width > 1){
            context.save();

            var r = this._getDrawRect(this._dragZone);
            context.strokeStyle = SharedColors.Highlight;
            context.lineWidth = 1/this._view.scale();
            context.strokeRect(r.x + .5, r.y + .5, r.width - 1, r.height - 1);
            context.restore();
        }
        if (this._editClone){
            context.save();
            this._editClone.viewMatrix().applyToContext(context);
            context.lineWidth = 1/this._view.scale();
            context.strokeStyle = SharedColors.Highlight;

            //-.5 to show the text cursor if it is at position 0, maybe can be done better...
            context.strokeRect(-.5, -.5, this._editClone.width() + 1, this._editClone.height() + 1);
            context.restore();
        }
        if (this._next){
            DropVisualization.highlightElement(this._view, context, this._next.element);
        }
    }
    _getDrawRect(zone){
        if (!zone.flipX && !zone.flipY){
            return Rect.fromObject(zone);
        }

        var x = zone.x;
        var y = zone.y;
        if (this._dragZone.flipX){
            x -= this._dragZone.width;
        }
        if (this._dragZone.flipY){
            y -= this._dragZone.height;
        }
        return new Rect(x, y, zone.width, zone.height);
    }
}
