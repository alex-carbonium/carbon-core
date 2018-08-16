import { deCRLFify } from "./TextUtil";
import Rect from "../../math/rect";
import { TextRange } from "./TextRange";
import { TextDoc } from "./TextDoc";
import { TextRuns } from "./TextRuns";
import { Renderer } from "./TextRenderer";
import { TextFormatting } from "carbon-text";

export class TextAdapter {
	_doc: TextDoc = null;
	_changeParam = 0;
	_renderer = null;
	_maxWidth = 0;
	_width = 1;
	_height = 1;
	_verticalShift = 0;
	_focused = true;
	_defaultFormatting: TextFormatting;
	_lastFormatting: TextFormatting;
	_rect: Rect;

	constructor(defaultFormatting: TextFormatting) {
		this.setDefaultFormatting(defaultFormatting);
		this._doc = new TextDoc();
	}

	updateSize(w, h) {
		TextRuns.setDefaultFormatting(this._defaultFormatting);
		this._width = w || 1;
		this._doc.width(this._width);
		this._height = h || 1;
		this._maxWidth = 4096;

		this._rect = new Rect(0, 0, this._width, this._height)
	}
	ensureContext(context) {
		if (this._renderer && this._renderer.getContext() !== context) {
			this._renderer = null;
		}
		if (this._renderer === null) {
			this._renderer = new Renderer(this, context);
		}
	}

	setText(txt) {
		TextRuns.setDefaultFormatting(this._defaultFormatting);
		var runs = null;
		if (typeof txt === "string") {
			var prevFormatting = this.getDocumentRange().getFormatting();
			txt = deCRLFify(txt);
			runs = {};
			if (prevFormatting) {
				runs = prevFormatting;
				runs.text = txt;
			} else {
				runs = { text: txt };
			}
			runs = [runs];
		} else if (txt instanceof Array) {
			runs = txt;
		} else {
			runs = [txt];
		}

		return this._doc.load(runs, false);
	}

	save() {
		TextRuns.setDefaultFormatting(this._defaultFormatting);
		return this._doc.save();
	}

	insert(ch) {
		TextRuns.setDefaultFormatting(this._defaultFormatting);
		this._doc.insert(ch);
	}

	setWrap(enable) {
		TextRuns.setDefaultFormatting(this._defaultFormatting);
		this._doc.wrap(enable);
	}

	setWidth(width) {
		TextRuns.setDefaultFormatting(this._defaultFormatting);
		this._width = width;
		if (width === undefined) {
			this._doc.width(this.getWidth() || this._maxWidth);
		} else {
			this._doc.width(width);
		}
	}

	getRealBounds() {
		TextRuns.setDefaultFormatting(this._defaultFormatting);
		var bounds = this._doc.frame.realBounds();
		return bounds;
	}

	getTopMargin() {
		TextRuns.setDefaultFormatting(this._defaultFormatting);
		var margin = this._doc.frame.topMargin();
		if (Number.isNaN(margin)) {
			return 0;
		}
		return margin;
	}

	getBottomMargin() {
		TextRuns.setDefaultFormatting(this._defaultFormatting);
		var margin = this._doc.frame.bottomMargin();
		if (Number.isNaN(margin)) {
			return 0;
		}
		return margin;
	}

	setHeight(height) {
		this._height = height;
	}

	getActualWidth() {
		TextRuns.setDefaultFormatting(this._defaultFormatting);
		if (!this._doc.frame) {
			return 0;
		}
		return Math.ceil(this._doc.frame.actualWidth());
	}

	getWidth() {
		return this._width;
	}

	getActualHeight() {
		TextRuns.setDefaultFormatting(this._defaultFormatting);
		if (!this._doc.frame) {
			return 0;
		}

		return this._doc.frame.bounds().height;
	}

	calculateMaxWordWidth() {
		let doc = this._doc;

		if (!doc.words) {
			return 0;
		}

		let result = 0;
		for (let i = 0; i < doc.words.length; ++i) {
			let word = doc.words[i];
			if (word.text && (word.text.width > result)) {
				result = word.text.width;
			}
		}
		return Math.ceil(result);
	}

	calculateMinPossibleHeight() {
		let doc = this._doc;

		if (!doc.frame) {
			return 0;
		}

		let result = 0;
		let lineHeight = 0;
		for (let i = 0; i < doc.frame.lines.length; ++i) {
			let line = doc.frame.lines[i];

			for (let j = 0; j < line.positionedWords.length; ++j) {
				let positionedWord = line.positionedWords[j];
				let wordHeight = positionedWord.word.getActualHeight();
				lineHeight = Math.max(lineHeight, wordHeight);
			}

			result += lineHeight;
		}
		return Math.ceil(result);
	}

	getActualWidthWithoutWrap() {
		TextRuns.setDefaultFormatting(this._defaultFormatting);
		if (!this._doc.frame) {
			return 0;
		}
		return Math.ceil(this._doc.frame.actualWidthWithoutWrap());
	}

	getHeight() {
		return this._height;
	}

	getLength() {
		if (!this._doc.frame) {
			return 0;
		}
		return this._doc.frame.length;
	}

	getCaretCoords(ord) {
		TextRuns.setDefaultFormatting(this._defaultFormatting);
		return this._doc.getCaretCoords(ord);
	}

	caretColor(value) {
		return this._doc.caretColor(value);
	}

	getSelection() {
		return this._doc.selection;
	}

	wordContainingOrdinal(ord) {
		TextRuns.setDefaultFormatting(this._defaultFormatting);
		return this._doc.wordContainingOrdinal(ord);
	}

	wordOrdinal(ord) {
		TextRuns.setDefaultFormatting(this._defaultFormatting);
		return this._doc.wordOrdinal(ord);
	}

	select(start, end, direction?) {
		TextRuns.setDefaultFormatting(this._defaultFormatting);
		return this._doc.select(start, end, false, direction);
	}

	undo() {
		TextRuns.setDefaultFormatting(this._defaultFormatting);
		return this._doc.performUndo();
	}

	redo() {
		TextRuns.setDefaultFormatting(this._defaultFormatting);
		return this._doc.performUndo(true);
	}

	getRange(start, end) {
		TextRuns.setDefaultFormatting(this._defaultFormatting);
		return this._doc.range(start, end);
	}

	selectedRange(): TextRange {
		TextRuns.setDefaultFormatting(this._defaultFormatting);
		return this._doc.selectedRange();
	}

	selectedParagraphRange() {
		TextRuns.setDefaultFormatting(this._defaultFormatting);
		var sel = this._doc.selectedRange();
		return this._doc.paragraphRange(sel.start, sel.end);
	}

	selectAll() {
		TextRuns.setDefaultFormatting(this._defaultFormatting);
		return this.select(0, this.getLength() - 1);
	}

	selectionChanged() {		
		return this._doc.selectionChanged;
	}

	notifySelectionChanged() {
		return this._doc.notifySelectionChanged();
	}

	contentChanged() {
		return this._doc.contentChanged;
	}

	getDocument() {
		TextRuns.setDefaultFormatting(this._defaultFormatting);
		return this._doc;
	}

	getDocumentRange(): TextRange {
		TextRuns.setDefaultFormatting(this._defaultFormatting);
		return this._doc.documentRange();
	}

	byCoordinate(x, y) {
		TextRuns.setDefaultFormatting(this._defaultFormatting);
		return this._doc.byCoordinate(x, y + this._verticalShift);
	}

	toggleCaret() {
		TextRuns.setDefaultFormatting(this._defaultFormatting);
		return this._doc.toggleCaret();
	}

	isSelectionChanged() {
		return this._doc.selectionJustChanged;
	}
	isCaretVisible() {
		return this._doc.caretVisible;
	}

	isModifyingInsertFormatting() {
		for (var i in this._doc.nextInsertFormatting) {
			return true;
		}
		return false;
	}

	nextInsertFormatting(): Partial<TextFormatting> {
		return this._doc.nextInsertFormatting;
	}

	render(context, drawSelection, vtrans, focused, env) {
		TextRuns.setDefaultFormatting(this._defaultFormatting);
		this.ensureContext(context);

		this._verticalShift = -vtrans;
		if (drawSelection) {
			this.drawSelection(context, focused, env);
		}
		this._doc.draw(this._renderer, this._rect);

		this._focused = focused;
	}

	drawSelection(context, focused, env) {
		TextRuns.setDefaultFormatting(this._defaultFormatting);
		this._doc.drawSelection(context, focused, this._lastFormatting, env);
	}

	focused() {
		return this._focused;
	}

	unsubscribe() {
		this._doc.selectionChanged.clearSubscribers();
		this._doc.contentChanged.clearSubscribers();
	}

	setDefaultFormatting(formatting) {
		this._defaultFormatting = formatting;
		TextRuns.setDefaultFormatting(formatting);
	}

	lastFormatting(value?): TextFormatting {
		if (arguments.length === 1) {
			this._lastFormatting = value;
		}
		return this._lastFormatting;
	}
}