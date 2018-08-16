import { FontWeight, FontStyle, UnderlineStyle } from "carbon-basics";
import { IMatrix, IFontManager, IRect } from "carbon-core";
import EventHelper from "../EventHelper";
import { TextAdapter } from "./TextAdapter";
import { TextRange } from "./TextRange";
import { TextPositionedWord } from "./TextPositionedWord";

var codes = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57,/*106,107,109,110,111,*/186, 187, 188, 189, 190, 191, 192, 219, 220, 221, 222, 224, 251, 252, 253, 254];
var codeMap = "0123456789;=,-./`[\\]'`[\\]'"; // *+-./ <- numpad
var codeMapS = ")!@#$%^&*(:+<_>?~{|}\"~{|}\"";
var isMac = navigator.userAgent.indexOf("Mac") != -1;

export class TextEditor {
    static IS_NON_PRINTABLE_REG = /^[\u0000-\u001f\u0080-\u009f\u2028\u2029]*$/;

    readonly onInvalidate = EventHelper.createEvent();
    readonly onSelectionChanged = EventHelper.createEvent();
    readonly onRangeFormattingChanged = EventHelper.createEvent<TextRange>();
    readonly onDeactivated = EventHelper.createEvent<boolean>();

    _editor = null;
    _view = null;
    _textUnderMouse = false;
    _activated = false;
    _keyboardSelect = 0;
    _keyboardX = null;
    _nextKeyboardX = null;
    _selectDragStart = null;
    _focusChar = null;
    _richClipboard = null;
    _plainClipboard = null;
    _toggles = null;
    _caretInterval = null;
    _lastSelect = undefined;
    _lastTimeStamp = -1;
    _lastResult = false;
    _keyDownHandled = null;    
    _matrixInverted: IMatrix;
    adapter: TextAdapter;
    _fontManager: IFontManager;
    _baseFont: any;    

    constructor() {
        this._toggles = {
            "66": 'weight',
            "73": 'style',
            "85": 'underline',
            //"S": 'strikeout'
        };
    }

    isActivated() {
        return this._activated;
    }
    
    activate(matrix, adapter: TextAdapter, baseFont, fontManager) {
        this._matrixInverted = matrix.clone().invert();

        this._activated = true;
        this.adapter = adapter;
        this._fontManager = fontManager;
        this._baseFont = baseFont;
        this._view = document.body;
        this._textUnderMouse = true;

        this.caretUpdate(true);

        this._view.addEventListener("keydown", this._keyDown);
        this._view.addEventListener("keypress", this._keyPress);
        this._view.addEventListener("keyup", this._keyUp);

        //unsubscribed in adapter.unsubscribe() call
        adapter.selectionChanged.bind(() => {
            this.onSelectionChanged.raise();
            this.onInvalidate.raise();
        });        
    }

    /** @override */
    deactivate(finalEdit?: boolean) {
        this._lastSelect = this.adapter.getSelection();
        this.adapter.select(0, 0);
        this._activated = false;

        clearInterval(this._caretInterval);
        this._caretInterval = 0;

        this._view.removeEventListener("keydown", this._keyDown);
        this._view.removeEventListener("keypress", this._keyPress);
        this._view.removeEventListener("keyup", this._keyUp);

        this.adapter.unsubscribe();

        this._view = null;
        this.onDeactivated.raise(finalEdit);
    }

    caretUpdate = (reset: boolean) => {
        if (reset) {
            clearInterval(this._caretInterval);
            this._caretInterval = setInterval(this.caretUpdate, 500);
        }
        this.adapter.toggleCaret();

        this.onInvalidate.raise();
    }

    getCaretBox() {
        var selection = this.adapter.getSelection();
        if (selection.end === selection.start) {
            if (this.adapter.isSelectionChanged() || this.adapter.isCaretVisible()) {
                return this.adapter.getCaretCoords(selection.start);
            }
        }
        return null;
    }

    getSelectionBoxes(): IRect[] {
        var selection = this.adapter.getSelection();
        if (selection.end !== selection.start) {
            var boxes: IRect[] = [];
            this.adapter.selectedRange().parts(function (part) {
                boxes.push(part.bounds());
            });
            return boxes;
        }

        return null;
    }

    _exhausted(ordinal, direction) {
        return direction < 0 ? ordinal <= 0 : ordinal >= this.adapter.getLength() - 1;
    }

    _differentLine(caret1, caret2) {
        return (caret1.b <= caret2.t) ||
            (caret2.b <= caret1.t);
    }

    _changeLine(ordinal, direction) {
        var originalCaret = this.adapter.getCaretCoords(ordinal), newCaret;
        this._nextKeyboardX = (this._keyboardX !== null) ? this._keyboardX : originalCaret.x;

        while (!this._exhausted(ordinal, direction)) {
            ordinal += direction;
            newCaret = this.adapter.getCaretCoords(ordinal);
            if (this._differentLine(newCaret, originalCaret)) {
                break;
            }
        }

        originalCaret = newCaret;
        while (!this._exhausted(ordinal, direction)) {
            if ((direction > 0 && newCaret.l >= this._nextKeyboardX) ||
                (direction < 0 && newCaret.l <= this._nextKeyboardX)) {
                break;
            }

            ordinal += direction;
            newCaret = this.adapter.getCaretCoords(ordinal);
            if (this._differentLine(newCaret, originalCaret)) {
                ordinal -= direction;
                break;
            }
        }

        return ordinal;
    }

    _endOfline(ordinal, direction) {
        var originalCaret = this.adapter.getCaretCoords(ordinal), newCaret;
        while (!this._exhausted(ordinal, direction)) {
            ordinal += direction;
            newCaret = this.adapter.getCaretCoords(ordinal);
            if (this._differentLine(newCaret, originalCaret)) {
                ordinal -= direction;
                break;
            }
        }
        return ordinal;
    }

    _handleKey(key, selecting, ctrlKey, altKey, metaKey, shiftKey) {
        var start = this.adapter.getSelection().start,
            end = this.adapter.getSelection().end,
            length = this.adapter.getLength() - 1;
        var handled = false;
        this._nextKeyboardX = null;

        if (!selecting) {
            this._keyboardSelect = 0;
        } else if (!this._keyboardSelect) {
            switch (key) {
                case 37: //left
                case 38: //top
                case 36: //home
                case 33: //page up
                    this._keyboardSelect = -1;
                    break;
                case 39: //right
                case 40: //down
                case 35: //end
                case 34: //page down
                    this._keyboardSelect = 1;
                    break;
            }
        }

        var ordinal = this._keyboardSelect === 1 ? end : start;

        var changingCaret = false;
        switch (key) {
            case 37: //left
                if (!selecting && start != end) {
                    ordinal = start;
                } else {
                    if (ordinal > 0) {
                        if (ctrlKey || (isMac && altKey)) {
                            var wordInfo = this.adapter.wordContainingOrdinal(ordinal);
                            if (wordInfo.ordinal === ordinal) {
                                ordinal = wordInfo.index > 0 ? this.adapter.wordOrdinal(wordInfo.index - 1) : 0;
                            }
                            else {
                                ordinal = wordInfo.ordinal;
                            }
                        }
                        else if (isMac && metaKey) {
                            ordinal = this._endOfline(ordinal, -1);
                        }
                        else {
                            ordinal--;
                        }
                    }
                }
                changingCaret = true;
                break;
            case 39: //right
                if (!selecting && start != end) {
                    ordinal = end;
                } else {
                    if (ordinal < length) {
                        if (ctrlKey || (isMac && altKey)) {
                            var wordInfo = this.adapter.wordContainingOrdinal(ordinal);
                            ordinal = wordInfo.ordinal + wordInfo.word.length;
                        } else if (isMac && metaKey) {
                            ordinal = this._endOfline(ordinal, 1);
                        }
                        else {
                            ordinal++;
                        }
                    }
                }
                changingCaret = true;
                break;
            case 40: //down
                ordinal = this._changeLine(ordinal, 1);
                changingCaret = true;
                break;
            case 38: //up
                ordinal = this._changeLine(ordinal, -1);
                changingCaret = true;
                break;
            case 36: // home
                ordinal = this._endOfline(ordinal, -1);
                changingCaret = true;
                break;
            case 35: //end
                ordinal = this._endOfline(ordinal, 1);
                changingCaret = true;
                break;
            case 33: //page down
                ordinal = 0;
                changingCaret = true;
                break;
            case 34: //page down
                ordinal = length;
                changingCaret = true;
                break;
            case 8: //backspace
                if (start > 0 && start === end) {
                    this.adapter.getRange(start - 1, start).clear();
                    this._focusChar = start - 1;
                    this.adapter.select(this._focusChar, this._focusChar);
                } else if (start !== end) {
                    this.adapter.getRange(start, end).clear();
                    this._focusChar = start;
                    this.adapter.select(this._focusChar, this._focusChar);
                }
                handled = true;
                this.onInvalidate.raise();
                break;
            case 46: //delete
                if (start < length) {
                    if (start === end) {
                        this.adapter.getRange(start, start + 1).clear();
                    } else {
                        this.adapter.getRange(start, end).clear();
                        this._focusChar = start;
                        this.adapter.select(this._focusChar, this._focusChar);
                    }
                }
                handled = true;
                break;
            case 32: //space
                if (this.adapter.getDocumentRange().plainText().toLowerCase() === "lorem") {
                    this.adapter.getDocumentRange().clear();
                    this.adapter.select(0, 0);
                    this.adapter.insert("Lorem ipsum dolor sit amet, consectetur adipiscing elit,\
    sed do eiusmod tempor incididunt ut labore et dolore magna\
    aliqua. Ut enim ad minim veniam, quis nostrud exercitation\
    ullamco laboris nisi ut aliquip ex ea commodo consequat.\
    Duis aute irure dolor in reprehenderit in voluptate velit\
    esse cillum dolore eu fugiat nulla pariatur. Excepteur sint\
    occaecat cupidatat non proident, sunt in culpa qui officia\
    deserunt mollit anim id est laborum.");
                } else {
                    this.adapter.insert(" ");
                }
                handled = true;
                break;
            case 13: //enter
                if (ctrlKey || metaKey) {
                    this.deactivate(true);
                }
                else {
                    this.adapter.insert("\n");
                }
                handled = true;
                break;
            case 9:
                this.adapter.insert("   ");
                handled = true;
                break;
            case 90: // Z undo
                if (ctrlKey || (metaKey && !shiftKey)) {
                    handled = true;
                    this.undo();

                    // if (editor.hasUndoState()){
                    //     editor.undoState();
                    // }
                }
                else if (metaKey && shiftKey) {
                    handled = true;
                    this.adapter.redo();
                }
                break;
            case 89: // Y redo
                if (ctrlKey) {
                    handled = true;
                    this.redo();
                    // if (editor.hasRedoState()){
                    //     editor.redoState();
                    // }
                }
                break;
            case 65: // A select all
                if (ctrlKey || metaKey) {
                    handled = true;
                    this.adapter.select(0, length);
                }
                break;
            case 27: //esc
                this.deactivate(true);
                break;
        }

        var toggle = this._toggles[key];
        if ((ctrlKey || metaKey) && toggle) {
            var selection = this.adapter.getSelection();
            var selRange = this.adapter.selectedRange();
            var formatting = selRange.getFormatting();
            var family = formatting.family || this._baseFont.family;
            var weight = formatting.weight || this._baseFont.weight;
            var style = formatting.style || this._baseFont.style;
            var underline = formatting.underline || this._baseFont.underline;
            if (toggle === "weight") {
                // editor.beginTransaction();
                weight = weight === FontWeight.Bold ? FontWeight.Regular : FontWeight.Bold;
                // editor.commitTransaction("Modify text properties");
            }
            else if (toggle === "style") {
                // editor.beginTransaction();
                style = style === FontStyle.Normal ? FontStyle.Italic : FontStyle.Normal;
                // editor.commitTransaction("Modify text properties");
            }
            else if (toggle === "underline") {
                // this._editor.contentSetEnabled(0);
                underline = underline !== UnderlineStyle.None ? UnderlineStyle.None : UnderlineStyle.Solid;
                // this._editor.contentSetEnabled(1);
            }
            this._fontManager.tryLoad(family, style, weight)
                .then(res => {
                    if (res) {
                        let range = this.adapter.getRange(selection.start, selection.end);
                        range.setFormatting(["family", "style", "weight", "underline"], [family, style, weight, underline]);
                        this.onRangeFormattingChanged.raise(range);
                    }
                    else {
                        console.log("//TODO: notify that font does not have selected style")
                    }
                });
            handled = true;
        }

        if (changingCaret) {
            switch (this._keyboardSelect) {
                case 0:
                    start = end = ordinal;
                    break;
                case -1:
                    start = ordinal;
                    break;
                case 1:
                    end = ordinal;
                    break;
            }

            if (start === end) {
                this._keyboardSelect = 0;
            } else {
                if (start > end) {
                    this._keyboardSelect = -this._keyboardSelect;
                    var t = end;
                    end = start;
                    start = t;
                }
            }
            this._focusChar = ordinal;
            this.caretUpdate(true);
            this.adapter.select(start, end, this._keyboardSelect === -1 ? "left" : "right");
            handled = true;
        }
        this._keyboardX = this._nextKeyboardX;
        return handled;
    }

    deleteSelected() {
        var start = this.adapter.getSelection().start,
            end = this.adapter.getSelection().end;

        this.adapter.getRange(start, end).clear();
        this._focusChar = start;
        this.adapter.select(this._focusChar, this._focusChar);
        this._keyboardX = null;
    }

    _canHandleInput(key, shift, ctrl, utfCode?) {
        var charKey = null;
        var keyCode = 0;
        var idx = 0;
        var isLetter = false;
        var retVal = false;

        if (utfCode) {
            var spl = utfCode.split("+");
            if (spl && spl.length > 1) {
                charKey = String.fromCharCode(parseInt(spl[1], 16))
            }
        }

        if (!charKey) {
            if ((typeof key === 'string' || key instanceof String) && key.length === 1) {
                charKey = key;
                keyCode = key.toLowerCase().charCodeAt(0);
                utfCode = null;
                // isLetter = key.toLowerCase() !== key;
            }
        }

        if (utfCode && charKey && charKey.length) {
            retVal = true;
        } else if (!ctrl && charKey) {
            if (shift) {
                if ((idx = codes.indexOf(keyCode)) >= 0) {
                    charKey = codeMapS.charAt(idx);
                }
                retVal = charKey && charKey.length;
            } else {
                if ((idx = codes.indexOf(keyCode)) >= 0) {
                    charKey = codeMap.charAt(idx);
                } else {
                    charKey = charKey.toLowerCase();
                }
                retVal = charKey && charKey.length;
            }
        }

        return retVal;
    }

    _keyPress = event => {
        if (!this.adapter.focused()) {
            return;
        }
        var keyUTF;
        if (String.fromCodePoint) {
            keyUTF = String.fromCodePoint(event.charCode);
        } else {
            keyUTF = String.fromCharCode(event.charCode);
        }
        if (TextEditor.IS_NON_PRINTABLE_REG.test(keyUTF)) {
            return;
        }
        // any key down handled arent accepted
        if (this._keyDownHandled) {
            return;
        }

        this.adapter.insert(keyUTF);
        event.preventDefault();
        event.stopPropagation();
        this.caretUpdate(true);
        return false;
    }

    _keyUp = event => {
        if (!this.adapter.focused()) {
            return;
        }
        this._keyDownHandled = null;
    }

    _keyDown = event => {
        if (!this.adapter.focused()) {
            return;
        }
        var ev = event.which || event.keyCode,
            shift = event.shiftKey,
            ctrl = event.ctrlKey,
            alt = event.altKey,
            meta = event.metaKey;

        if (this._handleKey(ev, shift, ctrl, alt, meta, shift)) {
            this._keyDownHandled = ev;
            event.preventDefault();
            event.stopPropagation();
            return false;
        }
        else if (this._canHandleInput(ev, shift, ctrl)) {
            return false;
        }
    }

    _transformPoint(pos) {
        return this._matrixInverted.transformPoint(pos);
    }

    mouseDblClick(event) {
        if (this._textUnderMouse) {
            var pt = this._transformPoint(event);
            var node = this.adapter.byCoordinate(pt.x, pt.y/* - this._editor._getVerticalOffset()*/);
            node = node.parent;
            if (node) {
                this.adapter.select(node.ordinal, node.ordinal +
                    (node instanceof TextPositionedWord && node.word ? node.word.text.length : node.length));
            }
        }
    }

    mouseDown(event, originalEvent?) {
        // if (event.button !== 0) {
        //     return;
        // }

        // Let editor do some work for mouse position
        // this._editor.updateByMousePosition(event.client, this._view.getWorldTransform());

        if (this._textUnderMouse) {
            if (originalEvent && originalEvent.detail >= 3) {
                this.setCursor(event, false, true);
            }
            else if (event.shiftKey) {
                this.setCursor(event, true);
            }
            else {
                this._selectDragStart = this.setCursor(event);
            }
        }
    }

    setCursor(pos, makeSelection?, selectLine?) {
        if (!this._activated) {
            return;
        }
        var pt = this._transformPoint(pos);
        var node = this.adapter.byCoordinate(pt.x, pt.y/* - this._editor._getVerticalOffset()*/) as TextPositionedWord;
        var start, end, direction;
        if (selectLine) {
            var line = node.word.line;
            start = line.ordinal;
            end = line.ordinal + line.length;
            direction = "right";
        }
        else if (makeSelection) {
            var selection = this.adapter.getSelection();
            if (selection.direction === "right") {
                start = Math.min(selection.start, node.ordinal);
                end = Math.max(selection.start, node.ordinal);
                direction = node.ordinal < selection.start ? "left" : "right";
            }
            else {
                start = Math.min(selection.end, node.ordinal);
                end = Math.max(selection.end, node.ordinal);
                direction = node.ordinal > selection.end ? "right" : "left";
            }
        }
        else {
            start = end = node.ordinal;
        }
        this.adapter.select(start, end, direction);
        this._keyboardX = null;
        return node.ordinal;
    }

    //_mouseDragStart
    //_mouseDrag
    //_mouseDragEnd

    /**
     * @param {GMouseEvent.Release} event
     * @private
     */
    mouseUp(event) {
        this._selectDragStart = null;
        this._keyboardX = null;
    }

    /** @override */
    mouseMove(event) {
        if (this._selectDragStart !== null) {
            var pt = this._transformPoint(event);
            var node = this.adapter.byCoordinate(pt.x, pt.y /*- this._editor._getVerticalOffset()*/);
            if (node) {
                this._focusChar = node.ordinal;
                if (this._selectDragStart > node.ordinal) {
                    this.adapter.select(node.ordinal, this._selectDragStart, "left");
                } else {
                    this.adapter.select(this._selectDragStart, node.ordinal, "right");
                }
            }
        }
    }

    undo() {
        if (!this.adapter.undo()) {
            this.deactivate(false);
        }
    }

    redo() {
        this.adapter.redo();
    }
    
    static onActivated() {
    }
}