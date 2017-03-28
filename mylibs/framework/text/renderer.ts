import {parseFont} from "./util/util";
import Runs from "./static/runs";
import FontManager from "../text/font/fontmanager";

	var Renderer: any = function(core, context) {
		this._canvasContext = context;
		// if (this._canvasContext.hasOwnProperty("imageSmoothingQuality")) {
		// 	this._canvasContext.imageSmoothingQuality = "high";
		// }
	}

	Renderer.RGBREGEX = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d+(?:\.\d+)?))?\s*\)$/;
	Renderer.prototype._defaultFill = null;
	Renderer.prototype._currentFont = null;
	Renderer.prototype._contextFont = null;
	Renderer.prototype._canvasContext = null;
	Renderer.prototype._textFillStyle = null;
	Renderer.prototype._textStrokeStyle = null;
	Renderer.prototype._fillTransform = null;
	Renderer.prototype._strokeTransform = null;

	Renderer.prototype.charSpacing = 0;

	Object.defineProperties(Renderer.prototype, {
		"defaultFill": {
			get: function ()      { return this._defaultFill;},
			set: function (style) { this._defaultFill = style; }
		},
	    "fillStyle": {
	    	get: function ()      {
	    		var fs = this._canvasContext.fillStyle;
	    		var reg = null;
	    		if (this._defaultFill &&
	    			(!fs || fs == "transparent" ||
	    				((reg=Renderer.RGBREGEX.exec(fs))&&(reg.length==5)&&(reg[4]==0)
	    				))) {
	    			fs = this._defaultFill;
	    		}
	    		return fs;
	    	},
			set: function (style) {
				// if (this._renderMode & Renderer.RENDERFLAG_LOCKFILL) {
				// 	return;
				// }
                //
				// if (style instanceof GPattern) {
				// 	this._textFillStyle = style;
				// } else {
				 	this._canvasContext.fillStyle = style;
				 	this._textFillStyle = null;
				// }
			}
		},
		"globalAlpha": {
	    	get: function ()      { return this._canvasContext.globalAlpha;  },
			set: function (a)     { this._canvasContext.globalAlpha = a;     }
		},
		"globalCompositeOperation": {
	    	get: function ()      { return this._canvasContext.globalCompositeOperation; },
			set: function (op)    { this._canvasContext.globalCompositeOperation = op;   }
		},
		"lineWidth": {
	    	get: function ()      { return this._canvasContext.lineWidth;    },
			set: function (w)     { this._canvasContext.lineWidth = w;       }
		},
		"lineCap": {
	    	get: function ()      { return this._canvasContext.lineCap;      },
			set: function (lc)    { this._canvasContext.lineCap = lc;        }
		},
		"lineJoin": {
	    	get: function ()      { return this._canvasContext.lineJoin;     },
			set: function (lj)    { this._canvasContext.lineJoin = lj;       }
		},
		"miterLimit": {
	    	get: function ()      { return this._canvasContext.miterLimit;   },
			set: function (ml)    { this._canvasContext.miterLimit = ml;     }
		},
		"strokeStyle": {
	    	get: function ()      { return this._canvasContext.strokeStyle;  },
			set: function (style) {
				if (this._renderMode & Renderer.RENDERFLAG_LOCKSTROKE) {
					return;
				}

				// if (style instanceof GPattern) {
				// 	this._textStrokeStyle = style;
				// } else {
					this._canvasContext.strokeStyle = style;
					this._textStrokeStyle = null;
				//}
			}
		},
		"font": {
	    	get: function ()      { return this._contextFont || this._canvasContext.font; },
			set: function (font)  {
				// var fontParams = parseFont(font, Runs.defaultFormatting);
				// var fontObj = this._getFont(
				// 						fontParams.family,
				// 						fontParams.style,
				// 						fontParams.weight
				// 					);
				//
				// if (fontObj) {
				// 	this._currentFont = fontObj;
				// }

				this._canvasContext.font = font;
				this._contextFont = font;
			}
		},
		"textBaseline": {
	    	get: function ()      { return this._canvasContext.textBaseline; },
			set: function (bsln)  { this._canvasContext.textBaseline = bsln; }
		},
		"textAlign": {
	    	get: function ()      { return this._canvasContext.textAlign;    },
			set: function (align) { this._canvasContext.textAlign = align;   }
		},
		"width": {
	    	get: function ()      { return this._canvasContext.width;        },
			set: function (width) { this._canvasContext.width = width;       }
		},
		"height": {
	    	get: function ()       { return this._canvasContext.height;      },
			set: function (height) { this._canvasContext.height = height;    }
		}
	});

	Renderer.prototype.renderMode = function (mode) {
		this._renderMode = mode;
	}

	Renderer.prototype.save = function () {
		this._canvasContext.save();
	}

	Renderer.prototype.restore = function () {
		this._canvasContext.restore();
	}

	Renderer.prototype.fill = function () {
		this._canvasContext.fill();
	}

	Renderer.prototype.fillRect = function (x, y, w, h, style) {
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

	Renderer.prototype.lineH = function (x, y, w, dash) {
		if (dash){
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
	Renderer.prototype.getCurrentFont = function () {
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
	Renderer.prototype._getFont = function (fontFamily, fontStyle, fontWeight) {
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

	Renderer.prototype.drawText = function (text, x, y) {
				this._canvasContext.fillStyle = this.fillStyle;
				this._canvasContext.fillText(text, x, y);
	}

	Renderer.prototype.getContext = function () {
		return this._canvasContext;
	}

	export default Renderer;