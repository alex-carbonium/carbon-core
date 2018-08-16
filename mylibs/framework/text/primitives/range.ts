import { Per } from "../util/per";
import { Runs } from "../static/runs";
import { TextNode } from "./node";
import { PositionedWord } from "../processing/positionedword";
import { ITextRange, ITextDoc, ITextNode, Emitter } from "carbon-text";

export class Range implements ITextRange {
    constructor(private doc: ITextDoc, public start, public end) {
        this.doc = doc;
        this.start = start;
        this.end = end;
        if (start > end) {
            this.start = end;
            this.end = start;
        }
    }

    parts(emit?: Emitter<PositionedWord>, list?: ITextNode[]) {
        list = list || this.doc.children();
        var self = this;

        list.some(function (item) {
            if (item.ordinal + item.length <= self.start) {
                return false;
            }
            if (item.ordinal >= self.end) {
                return true;
            }
            if (item.ordinal >= self.start &&
                item.ordinal + item.length <= self.end) {
                emit(item as PositionedWord);
            } else {
                self.parts(emit, item.children());
            }
        });
    };

    clear() {
        return this.setText([]);
    };

    setText(text) {
        return this.doc.splice(this.start, this.end, text);
    };

    runs(emit) {
        this.doc.runs(emit, this);
    };

    isDocumentRange() {
        return this.start === 0 && this.end === this.doc.frame.length - 1;
    };

    plainText() {
        return Per.create(this.runs, this).map(Runs.getPlainText).all().join('');
    };

    save() {
        return Per.create(this.runs, this).per(Runs.consolidate()).all();
    };

    getFormatting() {
        var range = this;
        if (range.start === range.end) {
            var pos = range.start;
            // take formatting of character before, if any, because that's
            // where plain text picks up formatting when inserted
            if (pos > 0) {
                pos--;
            }
            range.start = pos;
            range.end = pos + 1;
        }
        return Per.create(range.runs, range).reduce(Runs.merge).last() || Runs.getCurrentFormatting();
    };

    private _setSingleFormatting(attribute, value) {
        var range = this;

        if (range.start === range.end) {
            range.doc.modifyInsertFormatting(attribute, value);
        } else {
            var saved = range.save();
            var template = {};
            template[attribute] = value;
            Runs.format(saved, template);
            range.setText(saved);
        }
    }

    setFormatting(attributes, values) {
        var range = this;
        if (!(attributes instanceof Array)) {
            attributes = [attributes];
            values = [values];
        }

        var saved, template, paragraphRange: Range;

        for (var i = 0; i < attributes.length; i++) {
            var attribute = attributes[i],
                value = values[i];

            if (attribute === 'align' || attribute === 'lineSpacing') {
                // Special case: expand selection to surrounding paragraphs
                paragraphRange = range.doc.paragraphRange(range.start, range.end) as Range;
                paragraphRange._setSingleFormatting(attribute, value);
            } else {
                if (range.start === range.end) {
                    range.doc.modifyInsertFormatting(attribute, value);
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
        }
    };
}