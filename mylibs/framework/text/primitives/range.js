import Runs from "../static/runs";
import Per from "../util/per";

function Range(doc, start, end) {
        this.doc = doc;
        this.start = start;
        this.end = end;
        if (start > end) {
            this.start = end;
            this.end = start;
        }
    }

    Range.prototype.parts = function(emit, list) {
        list = list || this.doc.children();
        var self = this;

        list.some(function(item) {
            if (item.ordinal + item.length <= self.start) {
                return false;
            }
            if (item.ordinal >= self.end) {
                return true;
            }
            if (item.ordinal >= self.start &&
                item.ordinal + item.length <= self.end) {
                emit(item);
            } else {
                self.parts(emit, item.children());
            }
        });
    };

    Range.prototype.clear = function() {
        return this.setText([]);
    };

    Range.prototype.setText = function(text) {
        return this.doc.splice(this.start, this.end, text);
    };

    Range.prototype.runs = function(emit) {
        this.doc.runs(emit, this);
    };

    Range.prototype.plainText = function() {
        return Per.create(this.runs, this).map(Runs.getPlainText).all().join('');
    };

    Range.prototype.save = function() {
        return Per.create(this.runs, this).per(Runs.consolidate()).all();
    };

    Range.prototype.getFormatting = function() {
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

    Range.prototype._setSingleFormatting = function (attribute, value) {
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

    Range.prototype.setFormatting = function(attributes, values) {
        var range = this;
        if (!(attributes instanceof Array)) {
            attributes = [attributes];
            values = [values];
        }

        var saved, template, paragraphRange;

        for (var i = 0; i < attributes.length; i++) {
            var attribute = attributes[i],
                value = values[i];

            if (attribute === 'align' || attribute === 'lineSpacing') {
                // Special case: expand selection to surrounding paragraphs
                paragraphRange = range.doc.paragraphRange(range.start, range.end);
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
export default Range;