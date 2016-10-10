import Doc from "./doc";
import Renderer from "./renderer";
import Rect from "./primitives/rect";
import Runs from "./static/runs";
import {deCRLFify} from "./util/util";

import {TextAlign} from "framework/Defs";

	/**
	 * Class that serves all text layout related functions
	 * @class GTextCore
	 * @constructor
	 */
	function TextEngine() {
		this._doc = new Doc();

/*
--- in jira there was helpful src code to wait for availability, but unfortunately no JIRA - must somehow find a way...

  further on: more advanced features that were demanded
  x = done, D = discuss, T = test again

linus:
x text cursor
- some problem with undo and pasted text color, not sure how to reproduce
x ENTER key should resize tex box despite having auto height to off, so entire text is contained
x dbl click on textfield with texttool should highlight word when entering edit mode
- convert to path should put individual letters in separate path/compound path objects [then group]
D object align center isn't center anymore, when text resized <- isn't it the same for all objects?
D editing text in object doesn't maintain center align <- isn't it the same for all objects?
x Undo will give me multiple steps of red instead of red to black instantly
T duplication of multiple text, undo will not revert to previous step 
- if text in edit mode, changing the alignment from the panel, cannot continue to type the text, need to click back on the text again to continue type
x todo: pasting wide text into auto-width textfield: in case of being wider than canvas, turn off auto width and set max width to canvas width - text.x
x todo: \r line separator appears as square
todo: german/portuguese etc letters: seems to be working, esp. when opentype > 4.09, 4.09 didn't add symbols made of components
	 because components didn't have points generated. It could write them only if we previously written components, eg:
	 to write ą we should first write a, then write , and then ą will be available
	 also: strange accents keyboard on portuguese
x todo: feature: type lorem[space] - entire lorem ipsum added
todo: long press backspace: after a while delete words not chars
todo: undo, undo entire words not letters
todo: switch between native and gravit rendering
todo: on mouse over, switch font temporarily
todo: single click: select all, second click-edit, http://www.picmonkey.com/#edit - resize text box on edge, resize text size on handle
todo: click-release: empty textbox, probably problem with supersmall drag area 
todo: sometimes loading deferred font doesnt refresh prop panel
todo: text inherit previous text style
todo: fontpanel, focus on current font
x todo: keypress resizes
x todo: fix paste style option
x todo: makeSharp problem
x todo: problem when we take font, change 1 word bold, then change all words to italic
	reason: because in setProperties we set font by fontmanager, the prop that changed (eg style)
	is set but weight is unknown, because in selected range we've got multiple weights.
	so we don't know which font to require.
todo: ctrl+v inside existing text - the width is constrained. Ctrl+V on stage: pasted text doesn't have width constrained.

Kuhnen requests:
- background color
	- select area, background color
- linking text boxes, when 1 runs out of space, continue in 2nd
- indent in new paragraph
* Left Indent
* Right Indent
* First Line Indent
* Space Before
* Space After
* Font Background color
* Kerning
* Text-Frames / Link Text Boxes

alex:
- Select some text, change its color -> ok renders fine. But its not possible to change the alpha value of it?
	-- alpha in old text engine was also disabled, this will be a new feature
- Apply a gradient fill or color fill (not text color!) to whole text and set an alpha value of 50% or so. Now select some part of text and change its text color 
  —> its rendered in correct color but with the same opacity / alpha as the text’s fill !? (see also previous point, both together are weird ;))
  	-- yeah, I was leaving alpha unchanged...
- line height: compute from baseline when PX/PT is set, not add to current line height


major:
+- todo: wrong gradient when converted to path, because bbox of converted text is different than bbox of text
	top and bottom margin computed, but still something wrong
x+- todo: optimize Runs.merge - more/less done
todo: possible optimizations:
	optimize GUtil.parseFont routine - maybe some caching?
	use less drawImage: certainly less in text.js, paint immediately without intermediate canvas
todo: when convert to path text with gradient, gradient boxes may differ because text box area may be different
	than text area, and text box area is taken into account when showing gradient. text area should be taken into account
todo: on non-100% zoom, flip horizontal degrades text quality: wrong correction
todo: when all text deleted, cannot set formatting.
		solution: in range.setFormatting: 

		var dr = range.doc.documentRange();

        for (var i = 0; i < attributes.length; i++) {
            var attribute = attributes[i],
                value = values[i];

            if (attribute === 'align' || attribute === 'lineSpacing') {
                // Special case: expand selection to surrounding paragraphs
                paragraphRange = range.doc.paragraphRange(range.start, range.end);
                paragraphRange._setSingleFormatting(attribute, value);
            } else {
                if (range.start === range.end) {
                    if (range.start === dr.start && range.end === dr.end) {
                        if (!template) {
                            template = {text:""};
                        }
                        template[attribute] = value;
                    } else {
                        range.doc.modifyInsertFormatting(attribute, value);
                    }
                } else {
                    if (!saved) {
                        saved = range.save();
                        template = {};
                    }

                    template[attribute] = value;
                }
            }
        }

        if (saved) {
            Runs.format(saved, template);
            range.setText(saved);
        } else if (template) {
            range.doc.load([template]);
        }

        and in Split.split:
        if (inputChar.char === null) {
            emit(null); // Indicate end of stream
        }
		in emit parameter, add formatting details... or better:
		modify Runs.defaultFormatting !!! to be individual for each textfield

todo: undo on item that experienced deferred loading: wrong
todo: not greatest on Firefox
todo: cmd+v doesn't work in safari
todo: from some strange reason, not all keyup's are dispatched: MAC problem, CMD + key = no keyup
todo: "i" doesn't work in Life Savers font, and in Signika NEgative
todo: knife tool can cut paths touching each other, but if these paths are made compound - then nope
todo: implement mouse triple click (to select entire line)

not urgent:
todo: slow refresh of gradient editor on big zoom
todo: gradient borders with fillText/strokeText routines (right now they are black, and we have to turn off trans & dont scale border in text.js)
	problem: $_bpt.scale = 1, but for strokeText/fillText to work, gradient should be scaled to width of border, sth like:
	var pattern = this.$_bpt;
    if (pattern instanceof GGradient) {
        pattern = pattern.clone();
        pattern._scale = patternBBox.getWidth();               
    }
todo: check if lineSpacing isn't interfering with special codes for lists
todo: (performance) char cache in renderer.js, also visible for textmeter
todo: when gradient indicator has length 0 -> then color disappears
todo: support for gradient in "text color"
todo: context menu for copy and paste
todo: check selection indicator quality in big zoom
todo: when text is completely deleted, props are reset to default, not currently set in editor
	to overcome: change Runs.defaultProperties to take values from text.js (same as in previous todo concerning empty textfield)
	probably do it that way, so in text.js when setting property not to range, then modify defaultproperties
	also: serialie defaultproperties
todo: background paint -> it is strange : /
todo: transaction made after every tiny change of font color

minor:
todo: each time user creates a text, we should  check again for defaultFont if it isn't available. Because if it were once unavailable then it will never load again
todo: cursor over text: text cursor, cursor over selection: arrow
todo: (performance) distinguish dirty area from entire text area, to repaint less
todo: i want sliders for border width and other numeric values :/

some features:
todo: text tool selects text when over text object
todo: deal with clipping of text box at tbe bottom
todo: bulletz
todo: advanced txt bending
todo: antialiasing? FXAA? MSAA?
todo: WebGL? => http://codeazur.com.br/experiments/webgl_curve_1/index.html or 
      https://github.com/behdad/glyphy and https://github.com/onejs/onejs/blob/master/text.n

==============
writing on curves: additionally text.js's draw (or run.js's draw) method should have instead of x,y param for stroketext - functoin f(t) and t, then (t,f(t)) -> x,y
normally f(t) = const (y), and t = x, so (t,f(t)) => x,y

=> feed the text engine with that function that will produce letter coordinates, and the function will be giving the coordinates according to shape/path...
like shader for letters. 
FlowShader <-- this will bend text flow
LetterShader <-- this will bend individual letters, like pixelshader

experiment: only apply it to the renderer
===============
*/
	}

	TextEngine.prototype._doc = null;
	TextEngine.prototype._changeLock = 0;
	TextEngine.prototype._changeParam = 0;
	TextEngine.prototype._renderer = null;
	TextEngine.prototype._maxWidth = 0;
	TextEngine.prototype._width = 1;
	TextEngine.prototype._height = 1;
	TextEngine.prototype._verticalShift = 0;
	TextEngine.prototype._focused = true;

	// TextEngine.prototype.init = function (context) {
	// 	if (context){
	// 		this.ensureContext(context);
	// 	}
	// 	//this._canvasContext.canvas.style.imageRendering="pixelated"; //??
	// };
	TextEngine.prototype.updateSize = function(w, h){
		this._width = w || 1;
		this._doc.width(this._width);
		this._height = h || 1;
		this._maxWidth = 4096;

		this._rect = new Rect(0, 0, this._width, this._height)
	};
	TextEngine.prototype.ensureContext = function(context){
		if (this._renderer && this._renderer.getContext() !== context){
			this._renderer = null;
		}
		if (this._renderer === null){
			this._renderer = new Renderer(this, context);
		}
	};

	// Core.prototype.requireFont = function (font) {
	// 	if (this._fontCallback) {
	// 		this._fontCallback(font);
	// 	}
	// }

	TextEngine.prototype.setText = function(txt) {
		var runs = null;
		if (typeof txt == "string") {
			var prevFormatting = this.getDocumentRange().getFormatting();
			txt = deCRLFify(txt);
			runs = {};
			if (prevFormatting) {
				runs = prevFormatting;
				runs.text = txt;
			} else {
				runs = {text:txt};
			}
			runs = [runs];
		} else if (txt instanceof Array){
			if (txt.length && txt[0].valign){
				this.verticalAlignment(txt[0].valign);
			}
			runs = txt;
		} else {
			runs = [txt];
		}

		return this._doc.load(runs, false);
	};

 	TextEngine.prototype.save = function(){
		return this._doc.save();
	};

	// Core.prototype.setFont = function (font) {
	// 	this._currentFont = font;
	// }

	TextEngine.prototype.insert = function (ch) {
		this._doc.insert(ch);
	}

	TextEngine.prototype.setWrap = function (enable) {
		this._doc.wrap(enable);
	}

	TextEngine.prototype.setWidth = function (width) {
		this._width = width;
		if (width == TextEngine.AUTO) {
			this._doc.width(this.getWidth() || this._maxWidth); // if doc width small, text wraps in auto mode
		} else {
			this._doc.width(width);
		}
	}

	TextEngine.prototype.getRealBounds = function () {
		var bounds = this._doc.frame.realBounds();
		return bounds;
	}

	TextEngine.prototype.getTopMargin = function () {
		var margin = this._doc.frame.topMargin();
		if (Number.isNaN(margin)) {
			return 0;
		}
		return margin;
	}

	TextEngine.prototype.getBottomMargin = function () {
		var margin = this._doc.frame.bottomMargin();
		if (Number.isNaN(margin)) {
			return 0;
		}
		return margin;
	}

	TextEngine.prototype.setHeight = function (height) {
		this._height = height;
	}

	TextEngine.prototype.getActualWidth = function () {
		if (!this._doc.frame) {
			return 0;
		}
		return Math.ceil(this._doc.frame.actualWidth());
	}

	TextEngine.prototype.getWidth = function () {
		return this._width;
	}

	TextEngine.prototype.getActualHeight = function () {
		if (!this._doc.frame) {
			return 0;
		}

		return this._doc.frame.bounds().h;
	}

	TextEngine.prototype.getHeight = function () {
		return this._height;
	}

	TextEngine.prototype.getLength = function () {
		if (!this._doc.frame) {
			return 0;
		}
		return this._doc.frame.length;
	}

	TextEngine.prototype.getCaretCoords = function (ord) {
		return this._doc.getCaretCoords(ord);
	}

	TextEngine.prototype.caretColor = function (value) {
		return this._doc.caretColor(value);
	}

	TextEngine.prototype.getSelection = function () {
		return this._doc.selection;
	}

	TextEngine.prototype.wordContainingOrdinal = function (ord) {
		return this._doc.wordContainingOrdinal(ord);
	}

	TextEngine.prototype.wordOrdinal = function (ord) {
		return this._doc.wordOrdinal(ord);
	}

	TextEngine.prototype.select = function (start, end, direction) {
		return this._doc.select(start, end, false, direction);
	}

	TextEngine.prototype.undo = function () {
		return this._doc.performUndo();
	}

	TextEngine.prototype.redo = function () {
		return this._doc.performUndo(true);
	}

	TextEngine.prototype.getRange = function (start, end) {
		return this._doc.range(start, end);
	}

	TextEngine.prototype.selectedRange = function () {
		return this._doc.selectedRange();
	}

	TextEngine.prototype.selectedParagraphRange = function () {
		var sel = this._doc.selectedRange();
		return this._doc.paragraphRange(sel.start, sel.end);
	}

	TextEngine.prototype.selectAll = function () {
		return this.select(0, this.getLength()-1);
	}

	TextEngine.prototype.selectionChanged = function (callback, removeOthers) {
		if (removeOthers) {
			this._doc.selectionChanged.clearHandlers();
		}
		return this._doc.selectionChanged(callback);
	}

	TextEngine.prototype.notifySelectionChanged = function () {
		return this._doc.notifySelectionChanged();
	}

	TextEngine.prototype.contentChanged = function (callback, removeOthers) {
		var changeParam = this._changeParam;
		if (removeOthers) {
			this._doc.contentChanged.clearHandlers();
		}
		this._doc.contentChanged(function(noTransaction) {
			if (!this._changeLock) {
				return callback(changeParam);
			}
		}.bind(this));
	}

	TextEngine.prototype.getDocumentRange = function () {
		return this._doc.documentRange();
	}

	TextEngine.prototype.byCoordinate = function (x , y) {
		return this._doc.byCoordinate(x, y + this._verticalShift);
	}

	TextEngine.prototype.toggleCaret = function () {
		return this._doc.toggleCaret();
	}

	TextEngine.prototype.isSelectionChanged = function () {
		return this._doc.selectionJustChanged;
	}
	TextEngine.prototype.isCaretVisible = function () {
		return this._doc.caretVisible;
	}

	TextEngine.prototype.isModifyingInsertFormatting = function(){
		for (var i in this._doc.nextInsertFormatting){
			return true;
		}
		return false;
	};

	TextEngine.prototype.nextInsertFormatting = function(){
		return this._doc.nextInsertFormatting;
	};

	TextEngine.prototype.render = function(context, drawSelection, vtrans, focused){
		this.ensureContext(context);

		this._verticalShift = -vtrans;
		if (drawSelection){
			this.drawSelection(context, focused);
		}
        this._doc.draw(this._renderer, this._rect);

		this._focused = focused;
	};

	TextEngine.prototype.drawSelection = function (context, focused) {
		this._doc.drawSelection(context, focused, this._lastFormatting);
	}

	TextEngine.prototype.focused = function () {
		return this._focused;
	}

	TextEngine.prototype.unsubscribe = function() {
		this._doc.selectionChanged.clearHandlers();
		this._doc.contentChanged.clearHandlers();
	};

	TextEngine.setDefaultFormatting = function(formatting){
		Runs.setDefaultFormatting(formatting);
	};
	TextEngine.prototype.lastFormatting = function(value){
		if (arguments.length === 1){
			this._lastFormatting = value;
		}
		return this._lastFormatting;
};

	export default TextEngine;