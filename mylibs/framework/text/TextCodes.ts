import { inherit } from "./TextUtil";
import { TextNode } from "./TextNode";
import Rect from "../../math/rect";
import { TextPartRenderer } from "./TextPartRenderer";
import { TextGenericNode } from "./TextGenericNode";
import { TextFrame } from "./TextFrame";
import { IRect } from "carbon-core";
import { ITextNode } from "carbon-text";
import { TextLine } from "./TextLine";

const partRenderer = new TextPartRenderer();

export abstract class TextCodes {
    static codeFactory(obj, number, allCodes) {
        var Impl = TextCodes[obj.$];
        if (Impl) {
            return new Impl(obj, number, allCodes);
        }
        return null;
    }        
    
    static editFilter(doc) {
        var balance = 0;
    
        if (!doc.words.some(function (word, i) {
            var code = word.code();
            if (code) {
                switch (code.$) {
                    case 'ListStart':
                        balance++;
                        break;
                    case 'ListNext':
                        if (balance === 0) {
                            doc.spliceWordsWithRuns(i, 1, [inherit(word.codeFormatting(), {
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
    }
}

class TextInlineNode extends TextNode {
    inline = null;
    _parent = null;
    ordinal = null;
    length = null;
    formatting = null;
    measured = null;
    _bounds: IRect;
    baseline: any;

    constructor(inline, parent, ordinal, length, formatting) {
        super('', parent);

        if (!inline.draw || !inline.measure) {
            throw new Error();
        }
        this.inline = inline;
        this._parent = parent;
        this.ordinal = ordinal;
        this.length = length;
        this.formatting = formatting;
        this.measured = inline.measure(formatting);
    }

    draw(ctx) {
        this.inline.draw(ctx,
            this.left,
            this.baseline,
            this.measured.width,
            this.measured.ascent,
            this.measured.descent,
            this.formatting);
    }
    
    position(left, baseline, bounds) {
        this.left = left;
        this.baseline = baseline;
        if (bounds) {
            this._bounds = bounds;
        }
    }
    
    bounds(): IRect {
        return this._bounds || new Rect(this.left, this.baseline - this.measured.ascent,
            this.measured.width, this.measured.ascent + this.measured.descent);
    }
    
    byCoordinate(x, y) {
        if (x <= this.bounds().center().x) {
            return this;
        }
        return this.next();
    }
}

class TextNumberCode {
    formattedNumber = null;

    constructor(obj, number) {
        this.formattedNumber = (number + 1) + '.';
    }
    
    measure(formatting) {
        return partRenderer.measure(this.formattedNumber, formatting);
    }
    
    draw(ctx, x, y, width, ascent, descent, formatting) {
        partRenderer.draw(ctx, this.formattedNumber, formatting, x, y, width, ascent, descent);
    }    
}

class ListEnd {
    constructor(obj) {
        Object.keys(obj).forEach((name) => {
            this[name] = obj[name];
        });
    }
    
    eof = true;
    measure(formatting) {
        return { width: 18, ascender: 0, descender: 0 };
    }
    draw(ctx, x, y) {
        // ctx.fillText(text.enter, x, y);
    }
}

class TextListNext extends ListEnd {}

class TextListStart {
    constructor(obj, data, allCodes) {
        this.obj = obj;
        this.data = data;
        this.allCodes = allCodes;
    
        Object.keys(obj).forEach(function (name) {
            this[name] = obj[name];
        }.bind(this));
    }
    
    obj = null;
    data = null;
    allCodes = null;
    block(left, top, width, ordinal, parent, formatting, noWrap) {
        var list = new TextGenericNode('list', parent, left, top),
            itemNode,
            itemFrame,
            itemMarker;
    
        var indent = 50, spacing = 10;
    
        var startItem = (code, formatting) => {
            itemNode = new TextGenericNode('item', list);
            var marker = this.allCodes(code.marker || { $: 'Number' }, list.children.length);
            itemMarker = new TextInlineNode(marker, itemNode, ordinal, 1, formatting);
            itemMarker.block = true;
            itemFrame = new TextFrame(
                left + indent, top, width - indent, ordinal + 1, itemNode,
                function (terminatorCode) {
                    return terminatorCode.$ === 'ListEnd';
                },
                itemMarker.measured.ascent,
                undefined,
                noWrap
            );
        }
    
        startItem(this.obj, formatting);
    
        return function (inputWord) {
            if (itemFrame) {
                itemFrame.frame(function (finishedFrame: ITextNode) {
                    ordinal = finishedFrame.ordinal + finishedFrame.length;
                    var frameBounds = finishedFrame.bounds();
    
                    // get first line and position marker
                    var firstLine = finishedFrame.first();
                    var markerLeft = left + indent - spacing - itemMarker.measured.width;
                    var markerBounds = new Rect(left, top, indent, frameBounds.height);
                    if (firstLine instanceof TextLine && firstLine.baseline) {
                        itemMarker.position(markerLeft, firstLine.baseline, markerBounds);
                    } else {
                        itemMarker.position(markerLeft, top + itemMarker.measured.ascent, markerBounds);
                    }
    
                    top = frameBounds.y + frameBounds.height;
    
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
                    if (i.$ === 'ListEnd') {
                        list.finalize();
                        return list;
                    }
                    if (i.$ === 'ListNext') {
                        startItem(i, inputWord.codeFormatting());
                    }
                }
            }
        }
    }
} 