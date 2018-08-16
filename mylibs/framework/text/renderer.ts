import { parseFont } from "./util/util";
import { Runs } from "./static/runs";
import { FontManager } from "./font/fontmanager";

export class Renderer {
	static RGBREGEX = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d+(?:\.\d+)?))?\s*\)$/;
	defaultFill = null;
	_currentFont = null;
	_contextFont = null;
	_canvasContext = null;
	_textFillStyle = null;
	_textStrokeStyle = null;
	_fillTransform = null;
	_strokeTransform = null;
	charSpacing = 0;
	_renderMode: any;

	constructor(core, context) {
		this._canvasContext = context;
	}

	renderMode(mode) {
		this._renderMode = mode;
	}
	
	save() {
		this._canvasContext.save();
	}
	
	restore() {
		this._canvasContext.restore();
	}
	
	fill() {
		this._canvasContext.fill();
	}
	
	fillRect(x, y, w, h, style) {
		var oldStyle;
		if (style) {
			oldStyle = this._canvasContext.fillStyle;
			this._canvasContext.fillStyle = style;
		}
		this._canvasContext.fillRect(x, y, w, h);
		if (style) {
			this._canvasContext.fillStyle = oldStyle;
		}
	}
	
	lineH(x, y, w, dash) {
		if (dash) {
			this._canvasContext.setLineDash(dash);
		}
		this._canvasContext.beginPath();
		this._canvasContext.moveTo(x, y + .5);
		this._canvasContext.lineTo(x + w, y + .5);
		this._canvasContext.stroke();
	}
	
	/*
		Gets current font.
		If current font is unavailable, returns last available font.
		If this fails, returns default font.
	*/
	getCurrentFont() {
		var fontString = this.font;
		var fp = parseFont(fontString, Runs.defaultFormatting);
		var cf = this._currentFont;
	
		// current font is null, so either default one is unavailable or first wasn't available
		if (cf === null) {
			// try to get the font again
			cf = this._getFont(fp.family, fp.style, fp.weight);
			if (cf == null) {
				this._currentFont = FontManager.instance.getDefaultFont();
				return this._currentFont;
			} // else -> standard handling
		}
	
		if (fp.family !== cf.getFamily() || fp.weight !== cf.getWeight() || fp.style !== cf.getStyle()) {
			// context font different than currently loaded font
			// try to load again
			cf = this._getFont(fp.family, fp.style, fp.weight);
	
			if (cf === null) {
				// not success. return current font
				return this._currentFont;
			}
	
			// success. Replace current font
			this._currentFont = cf;
			return cf;
		}
	
		// all ok and available
		return cf;
	}
	
	/*
		Returns null if requested font is unavailable.
		Also sends a request for unavailable font.
	*/
	_getFont(fontFamily, fontStyle, fontWeight) {
		//var fontFamily, fontStyle, fontWeight;
		var font = FontManager.instance.getFont(fontFamily, fontStyle, fontWeight);
		//var retValue = font;
		if (!font) {
			font = FontManager.instance.getDefaultFont();
		}
	
		// if (font && (!font.isResolved())) {
		//     this._core.requireFont(font);
		//     font = fontMan.getDefaultFont();
		//     retValue = null;
		//     if (!font.isResolved()) {
		//         this._core.requireFont(font);
		//     }
		//}
		return font;
	}
	
	drawText(text, x, y) {
		this._canvasContext.fillStyle = this.fillStyle;
		this._canvasContext.fillText(text, x, y);
	}
	
	getContext() {
		return this._canvasContext;
	}

	get fillStyle() {
		var fs = this._canvasContext.fillStyle;
		var reg = null;
		if (this.defaultFill &&
			(!fs || fs == "transparent" ||
				((reg = Renderer.RGBREGEX.exec(fs)) && (reg.length == 5) && (reg[4] == 0)
				))) {
			fs = this.defaultFill;
		}
		return fs;
	}

	set fillStyle(style) {
		this._canvasContext.fillStyle = style;
		this._textFillStyle = null;
	}

	get globalAlpha() { return this._canvasContext.globalAlpha; }
	set globalAlpha(a) { this._canvasContext.globalAlpha = a; }
	get globalCompositeOperation() { return this._canvasContext.globalCompositeOperation; }
	set setglobalCompositeOperation(op) { this._canvasContext.globalCompositeOperation = op; }
	get lineWidth() { return this._canvasContext.lineWidth; }
	set lineWidth(w) { this._canvasContext.lineWidth = w; }
	get lineCap() { return this._canvasContext.lineCap; }
	set lineCap(lc) { this._canvasContext.lineCap = lc; }
	get lineJoin() { return this._canvasContext.lineJoin; }
	set lineJoin(lj) { this._canvasContext.lineJoin = lj; }
	get miterLimit() { return this._canvasContext.miterLimit; }
	set miterLimit(ml) { this._canvasContext.miterLimit = ml; }
	get strokeStyle() { return this._canvasContext.strokeStyle; }
	set strokeStyle(style) {
		this._canvasContext.strokeStyle = style;
		this._textStrokeStyle = null;
	}
	get font() { return this._contextFont || this._canvasContext.font; }
	set font(font) {
		this._canvasContext.font = font;
		this._contextFont = font;
	}
	get textBaseline() { return this._canvasContext.textBaseline; }
	set textBaseline(bsln) { this._canvasContext.textBaseline = bsln; }
	get textAlign() { return this._canvasContext.textAlign; }
	set textAlign(align) { this._canvasContext.textAlign = align; }
	get width() { return this._canvasContext.width; }
	set width(width) { this._canvasContext.width = width; }
	get height() { return this._canvasContext.height; }
	set height(height) { this._canvasContext.height = height; }


}