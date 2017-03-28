import Runs from "../static/runs";

    var Characters: any = function(runArray) {
        this._runArray = runArray;
        this.emit.bind(this);
    }
    Characters.prototype._runArray = null;
    Characters.prototype.emit = function (emit) {
        var c = firstNonEmpty(this._runArray, 0);
        while (!emit(c) && (c.char !== null)) {
            c = (c._offset + 1 < Runs.getTextLength(this._runArray[c._run].text))
                ? new Characters.Character(this._runArray, c._run, c._offset + 1)
                : firstNonEmpty(this._runArray, c._run + 1);
        }
    }

    Characters.Character = function (runArray, run, offset) {
        this._runs = runArray;
        this._run = run;
        this._offset = offset;
        this.char = run >= runArray.length ? null :
            runArray[run].text ? Runs.getTextChar(runArray[run].text, offset) :
            null;
    }

    Characters.Character.prototype._runs = null;
    Characters.Character.prototype._run = null;
    Characters.Character.prototype._offset = null;
    Characters.Character.prototype.char = null;

    Characters.Character.prototype.equals = function (other) {
        compatible(this, other);
        return this._run === other._run && this._offset === other._offset;
    };

    Characters.Character.prototype.cut = function (upTo) {
        compatible(this, upTo);
        var self = this;
        return function(eachRun) {
            for (var runIndex = self._run; runIndex <= upTo._run; runIndex++) {
                var run = self._runs[runIndex];
                if (run) {
                    var start = (runIndex === self._run) ? self._offset : 0;
                    var stop = (runIndex === upTo._run) ? upTo._offset : Runs.getTextLength(run.text);
                    if (start < stop) {
                        Runs.getSubText(function(piece) {
                            var pieceRun = Object.create(run);
                            pieceRun.text = piece;
                            eachRun(pieceRun);
                        }, run.text, start, stop - start);
                    }
                }
            }
        };
    };

    function compatible(a, b) {
        if (a._runs !== b._runs) {
            throw new Error('Characters for different documents');
        }
    };

    function firstNonEmpty(runArray, n) {
        for (; n < runArray.length; n++) {
            if (Runs.getTextLength(runArray[n].text) != 0) {
                return new Characters.Character(runArray, n, 0);
            }
        }
        return new Characters.Character(runArray, runArray.length, 0);
    }
    export default Characters;