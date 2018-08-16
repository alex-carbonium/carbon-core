import { Runs } from "../static/runs";

export class Characters {
    constructor(private runArray) {
    }
    emit(emit) {
        var c = this.firstNonEmpty(this.runArray, 0);
        while (!emit(c) && (c.char !== null)) {
            c = (c.offset + 1 < Runs.getTextLength(this.runArray[c.run].text))
                ? new Character(this.runArray, c.run, c.offset + 1)
                : this.firstNonEmpty(this.runArray, c.run + 1);
        }
    }        

    firstNonEmpty(runArray, n): Character {
        for (; n < runArray.length; n++) {
            if (Runs.getTextLength(runArray[n].text) != 0) {
                return new Character(runArray, n, 0);
            }
        }
        return new Character(runArray, runArray.length, 0);
    }
}

class Character {
    char: any;
    
    constructor(public runArray, public run, public offset) {
        this.char = run >= runArray.length ? null :
            runArray[run].text ? Runs.getTextChar(runArray[run].text, offset) :
            null;
    }

    equals(other: Character) {
        this.compatible(this, other);
        return this.run === other.run && this.offset === other.offset;
    }

    compatible(a: Character, b: Character) {
        if (a.runArray !== b.runArray) {
            throw new Error('Characters for different documents');
        }
    }

    cut(upTo: Character) {
        this.compatible(this, upTo);

        return (eachRun) => {
            for (var runIndex = this.run; runIndex <= upTo.run; runIndex++) {
                var run = this.runArray[runIndex];
                if (run) {
                    var start = (runIndex === this.run) ? this.offset : 0;
                    var stop = (runIndex === upTo.run) ? upTo.offset : Runs.getTextLength(run.text);
                    if (start < stop) {
                        Runs.getSubText((piece) => {
                            var pieceRun = Object.create(run);
                            pieceRun.text = piece;
                            eachRun(pieceRun);
                        }, run.text, start, stop - start);
                    }
                }
            }
        }
    }
}