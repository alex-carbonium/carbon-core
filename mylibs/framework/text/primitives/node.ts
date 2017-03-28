import Rect from "./rect";

    function Node () {
    }

    Node.prototype.first = function() {
        return this.children()[0];
    };

    Node.prototype.last = function() {
        return this.children()[this.children().length - 1];
    };

    Node.prototype.next = function() {
        var self = this;
        for (;;) {
            var parent = self.parent();
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
    };

    Node.prototype.previous = function() {
        var parent = this.parent();
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
    };

    Node.prototype.byOrdinal = function(index) {
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
    };

    Node.prototype.byCoordinate = function(x, y) {
        var found;
        this.children().some(function(child) {
            var b = child.bounds();
            if (b.contains(x, y)) {
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
    };

    Node.prototype.draw = function(ctx, viewPort) {
        this.children().forEach(function(child) {
            child.draw(ctx, viewPort);
        });
    };

    Node.prototype.parentOfType = function(type) {
        var p = this.parent();
        return p && (p.type === type ? p : p.parentOfType(type));
    };

    Node.prototype.bounds = function() {
        var l = this._left, t = this._top, r = 0, b = 0;
        this.children().forEach(function(child) {
            var cb = child.bounds();
            l = Math.min(l, cb.l);
            t = Math.min(t, cb.t);
            r = Math.max(r, cb.l + cb.w);
            b = Math.max(b, cb.t + cb.h);
        });
        return new Rect(l, t, r - l, b - t);
    };

    Node.prototype.children = function() {
        return [];
    };

    Node.prototype.parent = function() {
        return null;
    };

    export default Node;
