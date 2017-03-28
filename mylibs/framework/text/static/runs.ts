import { TextAlign, UnderlineStyle, FontScript, Dictionary } from "carbon-basics";

    var Runs: Dictionary = function() {
    }

    Runs.formattingKeys = [ 'weight', 'style', 'underline', 'strikeout', 'color',
        'family', 'size', 'align', 'valign', 'script', 'transformation', 'charSpacing', 'wordSpacing',
        'lineSpacing'];

    // todo: one of keys will be "font" object, another - pattern object, instead of color
    // todo: for faster comparison, more properties could be integers
    // they must be easily translatable to strings and v/versa
    Runs.defaultFormatting = {
        size: 10,
        family: null,
        weight: null,
        style: null,
        color: null,
        underline: UnderlineStyle.None,
        strikeout: false,
        align: TextAlign.left,
        script: FontScript.Normal,
        charSpacing: 0,
        lineSpacing: 1,
        wordSpacing: 0,
        valign: TextAlign.top
    };

    Runs.setDefaultFormatting = function(formatting){
        this._currentFormatting = null;
        this.defaultFormatting = formatting;
    };

    Runs._currentFormatting = null;
    Runs.getCurrentFormatting = function(){
        if (this._currentFormatting === null){
            this._currentFormatting = {};
            Object.assign(this._currentFormatting, Object.getPrototypeOf(this.defaultFormatting));
            Object.assign(this._currentFormatting, this.defaultFormatting);
        }
        return this._currentFormatting;
    };

    Runs.sameFormatting = function(run1, run2) {
        return Runs.formattingKeys.every(function(key) {
            return run1[key] === run2[key];
        })
    };

    /**
    Here, no need to do deep object cloning since we never modify run value
    **/
    Runs.clone = function(run) {
        var result = { text: run.text };
        Runs.formattingKeys.forEach(function(key) {
            var val = run[key];
            if (val && val !== Runs.defaultFormatting[key]) {
                result[key] = val;
            }
        });
        return result;
    };

    Runs.multipleValues = {};

    Runs.merge = function(run1, run2) {
        if (arguments.length === 1) {
            return Array.isArray(run1) ? run1.reduce(Runs.merge) : run1;
        }
        if (arguments.length > 2) {
            return Runs.merge(Array.prototype.slice.call(arguments, 0));
        }
        var merged = {};
        var keys = Runs.formattingKeys;
        // this must be optimized greatly, most frequently called func
        // for (var key in run1) {
        //     if (run2.hasOwnProperty(key) && run1[key] === run2[key]) {
        //         merged[key] = run1[key];
        //     } else {
        //         merged[key] = Runs.multipleValues;
        //     }
        // }
        // for (var key in run2) {
        //     if (!merged.hasOwnProperty(key)) {
        //         if (run1.hasOwnProperty(key) && run1[key] === run2[key]) {
        //             merged[key] = run1[key];
        //         } else {
        //             merged[key] = Runs.multipleValues;
        //         }
        //     }
        // }
        for (var i = keys.length-1; i >= 0; i--) {
            var key = keys[i];

            if (key in run1 || key in run2) {
                var r1 = run1[key];
                var r2 = run2[key];
                // if (r1 instanceof GPattern && r2 instanceof GPattern
                //     && GUtil.equals(r1, r2, true)) {
                //     merged[key] = r1;
                // } else
                if (r1 === r2) {
                    merged[key] = r1;
                } else {
                    merged[key] = Runs.multipleValues;
                }
            }
        }

        // Runs.formattingKeys.forEach(function(key) {
        //     if (key in run1 || key in run2) {
        //         if (GUtil.equals(run1[key], run2[key], true)) {
        //             merged[key] = run1[key];
        //         } else {
        //             merged[key] = Runs.multipleValues;
        //         }
        //     }
        // });
        return merged;
    };

    Runs.format = function(run, template) {
        if (Array.isArray(run)) {
            run.forEach(function(r) {
                Runs.format(r, template);
            });
        } else {
            Object.keys(template).forEach(function(key) {
                if (template[key] !== Runs.multipleValues) {
                    run[key] = template[key];
                }
            });
        }
    };

    Runs.consolidate = function() {
        var current;
        return function (emit, run) {
            if (!current || !Runs.sameFormatting(current, run) ||
                (typeof current.text != 'string') ||
                (typeof run.text != 'string')) {
                current = Runs.clone(run);
                emit(current);
            } else {
                current.text += run.text;
            }
        };
    };

    Runs.getPlainText = function(run) {
        if (typeof run.text === 'string') {
            return run.text;
        }
        if (Array.isArray(run.text)) {
            var str = [];
            run.text.forEach(function(piece) {
                str.push(Runs.getPiecePlainText(piece));
            });
            return str.join('');
        }
        return '_';
    };

    /*  The text property of a run can be an ordinary string, or a "character object",
     or it can be an array containing strings and "character objects".

     A character object is not a string, but is treated as a single character.

     We abstract over this to provide the same string-like operations regardless.
     */
    Runs.getPieceLength = function(piece) {
        return piece.length || 1; // either a string or something like a character
    };

    Runs.getPiecePlainText = function(piece) {
        return piece.length ? piece : '_';
    };

    Runs.getTextLength = function(text) {
        if (typeof text === 'string') {
            return text.length;
        }
        if (Array.isArray(text)) {
            var length = 0;
            text.forEach(function(piece) {
                length += Runs.getPieceLength(piece);
            });
            return length;
        }
        return 1;
    };

    Runs.getSubText = function(emit, text, start, count) {
        if (count === 0) {
            return;
        }
        if (typeof text === 'string') {
            emit(text.substr(start, count));
            return;
        }
        if (Array.isArray(text)) {
            var pos = 0;
            text.some(function(piece) {
                if (count <= 0) {
                    return true;
                }
                var pieceLength = Runs.getPieceLength(piece);
                if (pos + pieceLength > start) {
                    if (pieceLength === 1) {
                        emit(piece);
                        count -= 1;
                    } else {
                        var str = piece.substr(Math.max(0, start - pos), count);
                        emit(str);
                        count -= str.length;
                    }
                }
                pos += pieceLength;
            });
            return;
        }
        emit(text);
    };

    Runs.getTextChar = function(text, offset) {
        var result;
        Runs.getSubText(function(c) {
            result = c; // we could replace here strange control chars, but we'll rather do it on higher level to gain speed
        }, text, offset, 1);
        return result;
    };

    Runs.pieceCharacters = function(each, piece) {
        if (typeof piece === 'string') {
            for (var c = 0; c < piece.length; c++) {
                each(piece[c]);
            }
        } else {
            each(piece);
        }
    };

    export default Runs;
