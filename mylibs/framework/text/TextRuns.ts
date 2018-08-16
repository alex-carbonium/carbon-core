import { TextAlign, UnderlineStyle, FontScript } from "carbon-basics";
import { TextFormatting } from "carbon-text";

export class TextRuns {
    static formattingKeys = ['weight', 'style', 'underline', 'strikeout', 'color',
        'family', 'size', 'align', 'valign', 'script', 'transformation', 'charSpacing', 'wordSpacing',
        'lineSpacing'];

    static defaultFormatting: TextFormatting = {
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

    static _currentFormatting: TextFormatting = null;

    static readonly multipleValues = undefined;

    static setDefaultFormatting(formatting: TextFormatting) {
        TextRuns._currentFormatting = null;
        TextRuns.defaultFormatting = formatting;
    }

    static getCurrentFormatting(): TextFormatting {
        if (TextRuns._currentFormatting === null) {
            TextRuns._currentFormatting = {} as TextFormatting;
            Object.assign(TextRuns._currentFormatting, Object.getPrototypeOf(TextRuns.defaultFormatting));
            Object.assign(TextRuns._currentFormatting, TextRuns.defaultFormatting);
        }
        return TextRuns._currentFormatting;
    }

    static sameFormatting(run1, run2) {
        return TextRuns.formattingKeys.every(function (key) {
            return run1[key] === run2[key];
        })
    }

    static clone(run) {
        var result = { text: run.text };
        TextRuns.formattingKeys.forEach(function (key) {
            var val = run[key];
            if (val && val !== TextRuns.defaultFormatting[key]) {
                result[key] = val;
            }
        });
        return result;
    }

    static merge(run1, run2?) {
        if (arguments.length === 1) {
            return Array.isArray(run1) ? run1.reduce(TextRuns.merge) : run1;
        }
        if (arguments.length > 2) {
            return TextRuns.merge(Array.prototype.slice.call(arguments, 0));
        }
        
        var merged = {};
        var keys = TextRuns.formattingKeys;
        
        for (var i = keys.length - 1; i >= 0; i--) {
            var key = keys[i];

            if (key in run1 || key in run2) {
                var r1 = run1[key];
                var r2 = run2[key];
                if (r1 === r2) {
                    merged[key] = r1;
                } else {
                    merged[key] = TextRuns.multipleValues;
                }
            }
        }

        return merged;
    }

    static format(run, template) {
        if (Array.isArray(run)) {
            run.forEach(function (r) {
                TextRuns.format(r, template);
            });
        } else {
            Object.keys(template).forEach(function (key) {
                if (template[key] !== TextRuns.multipleValues) {
                    run[key] = template[key];
                }
            });
        }
    }

    static consolidate() {
        var current;
        return function (emit, run) {
            if (!current || !TextRuns.sameFormatting(current, run) ||
                (typeof current.text != 'string') ||
                (typeof run.text != 'string')) {
                current = TextRuns.clone(run);
                emit(current);
            } else {
                current.text += run.text;
            }
        }
    }

    static getPlainText(run) {
        if (typeof run.text === 'string') {
            return run.text;
        }
        if (Array.isArray(run.text)) {
            var str = [];
            run.text.forEach(function (piece) {
                str.push(TextRuns.getPiecePlainText(piece));
            });
            return str.join('');
        }
        return '_';
    }

    static getPieceLength(piece) {
        return piece.length || 1;
    }

    static getPiecePlainText(piece) {
        return piece.length ? piece : '_';
    }

    static getTextLength(text) {
        if (typeof text === 'string') {
            return text.length;
        }
        if (Array.isArray(text)) {
            var length = 0;
            text.forEach(function (piece) {
                length += TextRuns.getPieceLength(piece);
            });
            return length;
        }
        return 1;
    }

    static getSubText(emit, text, start, count) {
        if (count === 0) {
            return;
        }
        if (typeof text === 'string') {
            emit(text.substr(start, count));
            return;
        }
        if (Array.isArray(text)) {
            var pos = 0;
            text.some(function (piece) {
                if (count <= 0) {
                    return true;
                }
                var pieceLength = TextRuns.getPieceLength(piece);
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
    }

    static getTextChar(text, offset) {
        var result;
        TextRuns.getSubText(function (c) {
            result = c;
        }, text, offset, 1);
        return result;
    }

    static pieceCharacters(each, piece) {
        if (typeof piece === 'string') {
            for (var c = 0; c < piece.length; c++) {
                each(piece[c]);
            }
        } else {
            each(piece);
        }
    }
}
