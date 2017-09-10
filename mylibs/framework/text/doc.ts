import Node from "./primitives/node";
import Rect from "./primitives/rect";
import Range from "./primitives/range";
import Codes from "./processing/codes";
import Frame from "./processing/frame";
import Characters from "./processing/characters";
import Word from "./processing/word";
import Split from "./transform/split";
import Runs from "./static/runs";
import Per from "./util/per";
import {inherit, event, deCRLFify} from "./util/util";

import {TextAlign} from "carbon-basics";
import Environment from "../../environment";

const EmptyContents = [];

    function Doc () {
        this._width = 0;
        this.selection = { start: 0, end: 0, direction: "right" };
        this.nextInsertFormatting = {};
        this.customCodes = function(code, data, allCodes) {};
        this.codes = function(code, data) {
            var instance = Codes.codeFactory(code, data, this.codes);
            return instance || this.customCodes(code, data, this.codes);
        }.bind(this);
        this.selectionChanged = event();
        this.contentChanged = event();
        this.editFilters = [Codes.editFilter];
        this.load(EmptyContents);
    }

    inherit(Doc, Node);

    Doc.prototype.type = 'document';
    Doc.prototype._width = 0;
    Doc.prototype._noWrap = false;
    Doc.prototype._wordOrdinals = null;
    Doc.prototype.selection = null;
    Doc.prototype.caretVisible = true;
    Doc.prototype.customCodes = null;
    Doc.prototype.codes = null;
    Doc.prototype.selectionChanged = null;
    Doc.prototype.contentChanged = null;
    Doc.prototype.editFilters = null;
    Doc.prototype.nextInsertFormatting = {};
    Doc.prototype._nextSelection = null;
    Doc.prototype.words = null;
    Doc.prototype.undo = null;
    Doc.prototype.redo = null;
    Doc.prototype.frame = null;
    Doc.prototype.selectionJustChanged = false;
    Doc.prototype._currentTransaction = null;

    Doc.prototype.makeEditCommand = function(start, count, words) {
        var selStart = this.selection.start, selEnd = this.selection.end;
        return function(log) {
            this._wordOrdinals = [];
            var oldWords = Array.prototype.splice.apply(this.words, [start, count].concat(words));
            log(this.makeEditCommand(start, words.length, oldWords));
            this._nextSelection = { start: selStart, end: selEnd };
        }.bind(this);
    };

    Doc.prototype._makeTransaction = function(perform) {
        var commands = [];
        var log = function(command) {
            commands.push(command);
            log._length = commands.length;
        }.bind(this);
        perform(log);

        return function(outerLog) {
            outerLog(this._makeTransaction(function(innerLog) {
                while (commands.length) {
                    commands.pop()(innerLog);
                }
            }.bind(this)));
        }.bind(this);
    };

    function isBreaker(word) {
        if (word.isNewLine()) {
            return true;
        }
        var code = word.code();
        return !!(code && (code.block || code.eof));
    };

    Doc.prototype.load = function(runs, takeFocus, noTransaction) {
        var self = this;
        this.undo = [];
        this.redo = [];
        this._wordOrdinals = [];
        var charObj = new Characters(runs);
        var splitObj = new Split(self.codes);
        try {
            this.words = Per.create((charObj).emit,charObj).per((splitObj).split,splitObj).map(function(w) {
                return new Word(w, self.codes);
            }).all();
        } catch (e) {
            console.error(e);
            return false;
        }
        this.layout();
        this.contentChanged.fire(noTransaction);

        this.select(0, 0, takeFocus);

        return true;
    };

    Doc.prototype.layout = function() {
        this.frame = null;
        try {
            var frameObj = new Frame(0, 0, this._width, 0, this,
                undefined, undefined, undefined, this._noWrap);
            this.frame = Per.create(this.words).per((frameObj).frame,frameObj).first();
        } catch (x) {
            console.error(x);
        }
        if (!this.frame) {
            console.error('A bug somewhere has produced an invalid state - rolling back');
            this.performUndo();
        } else if (this._nextSelection) {
            var next = this._nextSelection;
            delete this._nextSelection;
            this.select(next.start, next.end);
        }
    };

    Doc.prototype.wrap = function(value) {
        if (arguments.length === 1) {
            this._noWrap = !value;
        }
        return !this._noWrap;
    };

    Doc.prototype.range = function(start, end) {
        return new Range(this, start, end);
    };

    Doc.prototype.documentRange = function() {
        return this.range(0, this.frame ? this.frame.length - 1 : 0);
    };
    Doc.prototype.selectedRange = function() {
        return this.range(this.selection.start, this.selection.end);
    };
    Doc.prototype.save = function() {
        return this.documentRange().save();
    };
    Doc.prototype.paragraphRange = function(start, end) {
        var i;

        // find the character after the nearest breaker before start
        var startInfo = this.wordContainingOrdinal(start);
        start = 0;
        if (startInfo) {
            for (i = startInfo.index; i > 0; i--) {
                if (isBreaker(this.words[i - 1])) {
                    start = this.wordOrdinal(i);
                    break;
                }
            }
        }

        // find the nearest breaker after end
        var endInfo = this.wordContainingOrdinal(end);
        end = this.frame ? this.frame.length - 1 : 0;
        if (endInfo) {
            if (isBreaker(endInfo.word)) {
                end = this.wordOrdinal(endInfo.index);
            } else {
                for (i = endInfo.index; i < this.words.length; i++) {
                    if (isBreaker(this.words[i])) {
                        end = this.wordOrdinal(i);
                        break;
                    }
                }
            }
        }

        return this.range(start, end);
    };
    Doc.prototype.insert = function(text, takeFocus) {
        if (typeof text == "string" || text instanceof String) {
            text = deCRLFify(text);
        }
        this.select(this.selection.end + this.selectedRange().setText(text), null, takeFocus);
    };
    Doc.prototype.modifyInsertFormatting = function(attribute, value) {
        this.nextInsertFormatting[attribute] = value;
        this.notifySelectionChanged();
    };
    Doc.prototype.applyInsertFormatting = function(text) {
        var formatting = this.nextInsertFormatting;
        var insertFormattingProperties = Object.keys(formatting);
        if (insertFormattingProperties.length) {
            text.forEach(function(run) {
                insertFormattingProperties.forEach(function(property) {
                    run[property] = formatting[property];
                });
            });
        }
    };
    Doc.prototype.wordOrdinal = function(index) {
        if (index < this.words.length) {
            var cached = this._wordOrdinals.length;
            if (cached < (index + 1)) {
                var o = cached > 0 ? this._wordOrdinals[cached - 1]  + this.words[cached - 1].length : 0;
                for (var n = cached; n <= index; n++) {
                    this._wordOrdinals[n] = o;
                    o += this.words[n].length;
                }
            }
            return this._wordOrdinals[index];
        }
    };
    Doc.prototype.wordContainingOrdinal = function(ordinal) {
        // could rewrite to be faster using binary search over this.wordOrdinal
        var result;
        var pos = 0;
        if (!this.words) {
            console.log("SOMETHING WRONG!");
            return {};
        }
        this.words.some(function(word, i) {
            if (ordinal >= pos && ordinal < (pos + word.length)) {
                result = {
                    word: word,
                    ordinal: pos,
                    index: i,
                    offset: ordinal - pos
                };
                return true;
            }
            pos += word.length;
        });
        return result;
    };

    Doc.prototype.runs = function(emit, range) {
        var startDetails = this.wordContainingOrdinal(Math.max(0, range.start)),
            endDetails = this.wordContainingOrdinal(Math.min(range.end, this.frame ? this.frame.length - 1 : 0));
        if (startDetails.index === endDetails.index) {
            startDetails.word.runs(emit, {
                start: startDetails.offset,
                end: endDetails.offset
            });
        } else {
            startDetails.word.runs(emit, { start: startDetails.offset });
            for (var n = startDetails.index + 1; n < endDetails.index; n++) {
                this.words[n].runs(emit);
            }
            endDetails.word.runs(emit, { end: endDetails.offset });
        }
    };

    Doc.prototype.spliceWordsWithRuns = function(wordIndex, count, runs) {
        var self = this;
        var charObj = new Characters(runs);
        var splitObj = new Split(self.codes);
        var newWords;
        try {
            newWords = Per.create((charObj).emit,charObj)
                .per((splitObj).split,splitObj)
                .truthy()
                .map(function(w) {
                    // var word;
                    // try{
                    //     word = new Word(w, self.codes);
                    // }catch(e){
                    //     word = null;
                    // }
                    return new Word(w, self.codes);
                })
                .all();
        } catch (e) {
            // some words coudn't be created, probably font hasn't loaded
            return;
        }

        // Check if old or new content contains any fancy control codes:
        var runFilters = false;

        if ('_filtersRunning' in self) {
            self._filtersRunning++;
        } else {
            for (var n = 0; n < count; n++) {
                if (this.words[wordIndex + n].code()) {
                    runFilters = true;
                }
            }
            if (!runFilters) {
                runFilters = newWords.some(function(word) {
                    return !!word.code();
                });
            }
        }

        this.transaction(function(log) {
            this.makeEditCommand(wordIndex, count, newWords)(log);
            if (runFilters) {
                this._filtersRunning = 0;
                try {
                    for (;;) {
                        var spliceCount = this._filtersRunning;
                        if (!this.editFilters.some(function(filter) {
                            filter(this);
                            return spliceCount !== self._filtersRunning;
                        }.bind(this))) {
                            break; // No further changes were made
                        }
                    }
                } finally {
                    delete self._filtersRunning;
                }
            }
        }.bind(this));
    };

    Doc.prototype.splice = function(start, end, text) {
        if (typeof text === 'string') {
            var sample = Math.max(0, start - 1);
            var sampleRun = Per.create({ start: sample, end: sample + 1 })
                .per(this.runs, this)
                .first();
            text = [
                sampleRun ? Object.create(sampleRun, { text: { value: text } }) : { text: text }
            ];
        } else if (!Array.isArray(text)) {
            text = [{ text: text }];
        }

        this.applyInsertFormatting(text);

        var startWord = this.wordContainingOrdinal(start),
            endWord = this.wordContainingOrdinal(end);

        if (!startWord || !endWord) {
            return 0;
        }

        var prefix;
        if (start === startWord.ordinal) {
            if (startWord.index > 0 && !isBreaker(this.words[startWord.index - 1])) {
                startWord.index--;
                var previousWord = this.words[startWord.index];
                prefix = Per.create({}).per(previousWord.runs, previousWord).all();
            } else {
                prefix = [];
            }
        } else {
            prefix = Per.create({ end: startWord.offset })
                    .per(startWord.word.runs, startWord.word)
                    .all();
        }

        var suffix;
        if (end === endWord.ordinal) {
            if ((end === (this.frame ? this.frame.length - 1 : 0)) || isBreaker(endWord.word)) {
                suffix = [];
                endWord.index--;
            } else {
                suffix = Per.create({}).per(endWord.word.runs, endWord.word).all();
            }
        } else {
            suffix = Per.create({ start: endWord.offset })
                    .per(endWord.word.runs, endWord.word)
                    .all();
        }

        var oldLength = this.frame ? this.frame.length : 0;

        this.spliceWordsWithRuns(startWord.index, (endWord.index - startWord.index) + 1,
            Per.create(prefix).concat(text).concat(suffix).per(Runs.consolidate()).all());

        return this.frame ? (this.frame.length - oldLength) : 0;
    };

    Doc.prototype.registerEditFilter = function(filter) {
        this.editFilters.push(filter);
    };

    Doc.prototype.width = function(width) {
        if (arguments.length === 0) {
            return this._width;
        }
        this._width = width;
    };

    Doc.prototype.children = function() {
        if (!this.frame) {
            return [];
        }

        return [this.frame];
    };
    Doc.prototype.toggleCaret = function() {
        var old = this.caretVisible;
        if (this.selection.start === this.selection.end) {
            if (this.selectionJustChanged) {
                this.selectionJustChanged = false;
            } else {
                this.caretVisible = !this.caretVisible;
            }
        }
        return this.caretVisible !== old;
    };
    Doc.prototype.getCaretCoords = function(ordinal, lastFormatting) {
        var node = this.byOrdinal(ordinal), b;
        if (node) {
            var nodeBefore;
            if (node.block && ordinal > 0) {
                nodeBefore = this.byOrdinal(ordinal - 1);
                if (nodeBefore.newLine) {
                    var newLineBounds = nodeBefore.bounds();
                    var lineBounds = nodeBefore.parent().parent().bounds();
                    b = new Rect(lineBounds.l, lineBounds.b, 1, newLineBounds.h);
                } else {
                    b = nodeBefore.bounds();
                    b = new Rect(b.r, b.t, 1, b.h);
                }
            } else {
                b = node.bounds();
                var bl = b.l;
                // correction so that the caret is visible at bounds
                // if (ordinal > 0) {
                //     nodeBefore = this.byOrdinal(ordinal - 1);
                //     if (!nodeBefore.newLine && node.newLine) {
                //         bl -= 1;
                //     }
                // }

                if (b.h) {
                    b = new Rect(bl, b.t, 1, b.h);
                } else {
                    nodeBefore = this.byOrdinal(ordinal - 1);
                    var b4 = nodeBefore.bounds();
                    if (b4.h) {
                        b = new Rect(bl, b.t, 1, b4.h);
                    } else {
                        b = new Rect(bl, b.t, b.w, 1);
                    }
                }
            }

            if (lastFormatting){
                if (node.word && node.word.line.length === 1){
                    if (lastFormatting.align === TextAlign.center){
                        b.l = this._width/2 + .5|0;
                    }
                    else if (lastFormatting.align === TextAlign.right){
                        b.l = this._width;
                    }
                    b.r = b.l + b.w;
                }
            }

            return b;
        }
    };
    Doc.prototype.caretColor = function(value){
        if (arguments.length === 1){
            this._caretColor = value;
        }
        return this._caretColor;
    };
    Doc.prototype.byCoordinate = function(x, y) {
        if (!this.frame) {
            return null;
        }
        if (x < 0) {
            x = 0;
        }
        var ordinal = this.frame.byCoordinate(x, y).ordinal;
        var caret = this.getCaretCoords(ordinal);
        while (caret.b <= y && ordinal < (this.frame.length - 1)) {
            ordinal++;
            caret = this.getCaretCoords(ordinal);
        }
        while (caret.t >= y && ordinal > 0) {
            ordinal--;
            caret = this.getCaretCoords(ordinal);
        }
        return this.byOrdinal(ordinal);
    };
    Doc.prototype.drawSelection = function(ctx, hasFocus, lastFormatting) {
        if (this.selection.end === this.selection.start) {
            if (hasFocus && (this.selectionJustChanged || this.caretVisible)) {
                var caret = this.getCaretCoords(this.selection.start, lastFormatting);
                if (caret) {
                    ctx.save();
                    ctx.fillStyle = this.caretColor() || 'black';
                    caret.fill(ctx, 1/Environment.view.scale());
                    ctx.restore();
                }
            }
        } else {
            ctx.save();
            ctx.fillStyle = hasFocus ? 'rgba(0, 100, 200, 0.3)' : 'rgba(160, 160, 160, 0.3)';
            this.selectedRange().parts(function(part) {
                part.bounds(true).fill(ctx);
            });
            ctx.restore();
        }
    };
    Doc.prototype.notifySelectionChanged = function(takeFocus) {
        // When firing selectionChanged, we pass a function can be used
        // to obtain the formatting, as this highly likely to be needed
        var cachedFormatting = null;
        var self = this;
        var getFormatting = function() {
            if (!cachedFormatting) {
                cachedFormatting = self.selectedRange().getFormatting();
            }
            return cachedFormatting;
        };
        this.selectionChanged.fire(getFormatting, takeFocus);
    };
    Doc.prototype.select = function(ordinal, ordinalEnd, takeFocus, direction = "right") {
        if (!this.frame) {
            // Something has gone terribly wrong - doc.transaction will rollback soon
            return;
        }
        this.selection.start = Math.max(0, ordinal);
        this.selection.end = Math.min(
            typeof ordinalEnd === 'number' ? ordinalEnd : this.selection.start,
            this.frame.length - 1
        );
        this.selection.direction = direction;
        this.selectionJustChanged = true;
        this.caretVisible = true;
        this.nextInsertFormatting = {};

        /*  NB. always fire this even if the positions stayed the same. The
            event means that the formatting of the selection has changed
            (which can happen either by moving the selection range or by
            altering the formatting)
        */
        this.notifySelectionChanged(takeFocus);
    };
    Doc.prototype.performUndo = function(redo) {
        var fromStack = redo ? this.redo : this.undo,
            toStack = redo ? this.undo : this.redo,
            oldCommand = fromStack.pop();

        if (oldCommand) {
            oldCommand(function(newCommand) {
                toStack.push(newCommand);
            });
            this.layout();
            this.contentChanged.fire();
            return true;
        }
        return false;
    };
    Doc.prototype.canUndo = function(redo) {
        return redo ? !!this.redo.length : !!this.undo.length;
    };
    Doc.prototype.transaction = function(perform) {
        if (this._currentTransaction) {
            perform(this._currentTransaction);
        } else {
            var self = this;
            while (this.undo.length > 50) {
                self.undo.shift();
            }
            this.redo.length = 0;
            var changed = false;
            this.undo.push(this._makeTransaction(function(log) {
                this._currentTransaction = log;
                try {
                    perform(log);
                } finally {
                    changed = log._length > 0;
                    this._currentTransaction = null;
                }
            }.bind(this)));
            if (changed) {
                self.layout();
                self.contentChanged.fire();
            }
        }
    };
    export default Doc;