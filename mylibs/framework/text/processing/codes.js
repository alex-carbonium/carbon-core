import Node from "../primitives/node";
import GenericNode from "../primitives/genericnode";
import Frame from "./frame";
import Rect from "../primitives/rect";
import TextRender from "../static/textrender";
import {inherit} from "../util/util";

    function Codes() {
        throw new Error("Codes class cannot be instantiated");
    }
    
    Codes.codeFactory = function (obj, number, allCodes) {
        var Impl = Codes[obj.$];
        if (Impl) {
            return new Impl(obj, number, allCodes);
        }
        return null;
    }

    Codes.InlineNode = function(inline, parent, ordinal, length, formatting) {
        if (!inline.draw || !inline.measure) {
            throw new Error();
        }
        this.inline = inline;
        this._parent = parent;
        this.ordinal = ordinal;
        this.length = length;
        this.formatting = formatting;
        this.measured = inline.measure(formatting);
    };

    inherit(Codes.InlineNode, Node);

    Codes.InlineNode.prototype.inline = null;
    Codes.InlineNode.prototype._parent = null;
    Codes.InlineNode.prototype.ordinal = null;
    Codes.InlineNode.prototype.length = null;
    Codes.InlineNode.prototype.formatting = null;
    Codes.InlineNode.prototype.measured = null;

    Codes.InlineNode.prototype.parent = function() {
        return this._parent;
    };

    Codes.InlineNode.prototype.draw = function(ctx) {
        this.inline.draw(ctx,
            this.left,
            this.baseline,
            this.measured.width,
            this.measured.ascent,
            this.measured.descent,
            this.formatting);
    };

    Codes.InlineNode.prototype.position = function(left, baseline, bounds) {
        this.left = left;
        this.baseline = baseline;
        if (bounds) {
            this._bounds = bounds;
        }
    };

    Codes.InlineNode.prototype.bounds = function() {
        return this._bounds || new Rect(this.left, this.baseline - this.measured.ascent,
            this.measured.width, this.measured.ascent + this.measured.descent);
    };

    Codes.InlineNode.prototype.byCoordinate = function(x, y) {
        if (x <= this.bounds().center().x) {
            return this;
        }
        return this.next();
    }

    Codes.Number = function(obj, number) {
        this.formattedNumber = (number + 1) + '.';
    }

    Codes.Number.prototype.measure = function(formatting) {
        return TextRender.measure(this.formattedNumber, formatting);
    };

    Codes.Number.prototype.draw = function(ctx, x, y, width, ascent, descent, formatting) {
        TextRender.draw(ctx, this.formattedNumber, formatting, x, y, width, ascent, descent);
    };

    Codes.Number.prototype.formattedNumber = null;

    // Codes.listEnd = function (obj) {
    //     return _.Util.derive(obj, Codes.ListEnd.prototype);
    // };

    Codes.ListEnd = function (obj) {
        Object.keys(obj).forEach(function(name) {
            this[name] = obj[name];
        }.bind(this));
    }

    Codes.ListEnd.prototype.eof = true;
    Codes.ListEnd.prototype.measure = function(formatting) {
        return { width: 18, ascent: 0, descent: 0 }; // _.TextRender.measure(text.enter, formatting);
    };
    Codes.ListEnd.prototype.draw = function(ctx, x, y) {
        // ctx.fillText(text.enter, x, y);
    }

    Codes.ListNext = Codes.ListEnd;

    // Codes.listStart = function(obj, data, allCodes) {
    //     return util.derive(obj, Codes.ListStart);
    // };

    Codes.ListStart = function (obj, data, allCodes) {
        this.obj = obj;
        this.data = data;
        this.allCodes = allCodes;

        Object.keys(obj).forEach(function(name) {
            this[name] = obj[name];
        }.bind(this));
    }

    Codes.ListStart.prototype.obj = null;
    Codes.ListStart.prototype.data = null;
    Codes.ListStart.prototype.allCodes = null;
    Codes.ListStart.prototype.block = function(left, top, width, ordinal, parent, formatting, noWrap) {
        var list = new GenericNode('list', parent, left, top),
            itemNode,
            itemFrame,
            itemMarker;

        var indent = 50, spacing = 10;

        var startItem = function(code, formatting) {
            itemNode = new GenericNode('item', list);
            var marker = this.allCodes(code.marker || { $: 'Number' }, list.children().length);
            itemMarker = new Codes.InlineNode(marker, itemNode, ordinal, 1, formatting);
            itemMarker.block = true;
            itemFrame = new Frame(
                left + indent, top, width - indent, ordinal + 1, itemNode,
                function(terminatorCode) {
                    return terminatorCode.$ === 'ListEnd';
                },
                itemMarker.measured.ascent,
                undefined,
                noWrap
            );
        }.bind(this);

        startItem(this.obj, formatting);

        return function(inputWord) {
            if (itemFrame) {
                itemFrame.frame(function(finishedFrame) {
                    ordinal = finishedFrame.ordinal + finishedFrame.length;
                    var frameBounds = finishedFrame.bounds();

                    // get first line and position marker
                    var firstLine = finishedFrame.first();
                    var markerLeft = left + indent - spacing - itemMarker.measured.width;
                    var markerBounds = new Rect(left, top, indent, frameBounds.h);
                    if ('baseline' in firstLine) {
                        itemMarker.position(markerLeft, firstLine.baseline, markerBounds);
                    } else {
                        itemMarker.position(markerLeft, top + itemMarker.measured.ascent, markerBounds);
                    }

                    top = frameBounds.t + frameBounds.h;

                    itemNode.children().push(itemMarker);
                    itemNode.children().push(finishedFrame);
                    itemNode.finalize();

                    list.children().push(itemNode);
                    itemNode = itemFrame = itemMarker = null;
                }, inputWord);
            } else {
                ordinal++;
            }

            if (!itemFrame) {
                var i = inputWord.code();
                if (i) {
                    if (i.$ == 'ListEnd') {
                        list.finalize();
                        return list;
                    }
                    if (i.$ == 'ListNext') {
                        startItem(i, inputWord.codeFormatting());
                    }
                }
            }
        };
    }


    Codes.editFilter = function(doc) {
        var balance = 0;

        if (!doc.words.some(function(word, i) {
            var code = word.code();
            if (code) {
                switch (code.$) {
                    case 'ListStart':
                        balance++;
                        break;
                    case 'ListNext':
                        if (balance === 0) {
                            doc.spliceWordsWithRuns(i, 1, [util.derive(word.codeFormatting(), {
                                text: {
                                    $: 'ListStart',
                                    marker: code.marker
                                }
                            })]);
                            return true;
                        }
                        break;
                    case 'ListEnd':
                        if (balance === 0) {
                            doc.spliceWordsWithRuns(i, 1, []);
                        }
                        balance--;
                        break;
                }
            }
        })) {
            if (balance > 0) {
                var ending = [];
                while (balance > 0) {
                    balance--;
                    ending.push({
                        text: { $: 'ListEnd' }
                    });
                }
                doc.spliceWordsWithRuns(doc.words.length - 1, 0, ending);
            }
        }
    };

    export default Codes;