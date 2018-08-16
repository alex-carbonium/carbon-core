import Rect from "../../../math/rect";
import { IRect } from "carbon-core";

export class TextNode {
    ordinal: number;    
    length: number;
    block: boolean;
    newLine: boolean;    

    constructor(
        public readonly type: string, 
        public readonly parent: TextNode,                 
        public left: number = Number.MAX_VALUE,
        public top: number = Number.MAX_VALUE
    ) {        
    }

    children(): TextNode[] {
        return [];
    }

    first() {
        return this.children()[0];
    }

    last(){
        let children = this.children();
        return children[children.length - 1];
    }

    next(){
        var self: TextNode = this;
        for (;;) {
            var parent = self.parent;
            if (!parent) {
                return null;
            }
            var siblings = parent.children();
            var next = siblings[siblings.indexOf(self) + 1];
            if (next) {
                for (;;)  {
                    if (!next.first){
                        console.log("dupa");
                    }
                    var first = next.first();
                    if (!first) {
                        break;
                    }
                    next = first;
                }
                return next;
            }
            self = parent;
        }
    }

    previous() {
        var parent = this.parent;
        if (!parent) {
            return null;
        }
        var siblings = parent.children();
        var prev = siblings[siblings.indexOf(this) - 1];
        if (prev) {
            return prev;
        }
        var prevParent = parent.previous();
        return !prevParent ? null : prevParent.last();
    }

    byOrdinal(index): TextNode {
        var found = null;
        if (this.children().some(function(child) {
            if (index >= child.ordinal && index < child.ordinal + child.length) {
                found = child.byOrdinal(index);
                if (found) {
                    return true;
                }
            }
        })) {
            return found;
        }
        return this;
    }

    byCoordinate(x, y) {
        var found;
        this.children().some(function(child) {
            var b = child.bounds();
            if (b.containsCoordinates(x, y)) {
                found = child.byCoordinate(x, y);
                if (found) {
                    return true;
                }
            }
        });

        if (!found) {
            found = this.last();
            while (found) {
                var next = found.last();
                if (!next) {
                    break;
                }
                found = next;
            }
            var foundNext = found.next();
            if (foundNext && foundNext.block) {
                found = foundNext;
            }
        }
        return found;
    }

    draw(ctx, viewPort) {
        this.children().forEach(function(child) {
            child.draw(ctx, viewPort);
        });
    }

    parentOfType(type) {
        var p = this.parent;
        return p && (p.type === type ? p : p.parentOfType(type));
    }

    bounds(): IRect {
        var l = this.left, t = this.top, r = 0, b = 0;
        this.children().forEach(function(child) {
            var cb = child.bounds();
            l = Math.min(l, cb.x);
            t = Math.min(t, cb.y);
            r = Math.max(r, cb.x + cb.width);
            b = Math.max(b, cb.y + cb.height);
        });
        return new Rect(l, t, r - l, b - t);
    }  
}    
