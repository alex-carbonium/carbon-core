import { TextNode } from "./TextNode";

export class TextGenericNode extends TextNode {
    constructor(type, parent, left: number = Number.MAX_VALUE, top: number = Number.MAX_VALUE) {
        super(parent, type, left, top);
    }

    finalize(startDecrement?, lengthIncrement?) {
        var start = Number.MAX_VALUE, end = 0;
        this.children().forEach(function (child) {
            start = Math.min(start, child.ordinal);
            end = Math.max(end, child.ordinal + child.length);
        });
        this.ordinal = start - (startDecrement || 0);
        this.length = (lengthIncrement || 0) + end - start;
    }
}    