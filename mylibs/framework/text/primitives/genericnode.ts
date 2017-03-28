import {inherit} from "../util/util";
import Node from "./node";

    function GenericNode (type, parent, left?: any, top?: any) {
        this.type = type;
        this._children = [];
        this._parent = parent;
        this._left = typeof left === 'number' ? left : Number.MAX_VALUE;
        this._top = typeof top === 'number' ? top : Number.MAX_VALUE;
    }
    inherit(GenericNode, Node);

    GenericNode.prototype.type = null;
    GenericNode.prototype._children = null;
    GenericNode.prototype._parent = null;
    GenericNode.prototype._left = undefined;
    GenericNode.prototype._top = undefined;

    /* override */
    GenericNode.prototype.children = function() {
        return this._children;
    };

    /* override */
    GenericNode.prototype.parent = function() {
        return this._parent;
    };

    GenericNode.prototype.finalize = function(startDecrement, lengthIncrement) {
        var start = Number.MAX_VALUE, end = 0;
        this._children.forEach(function(child) {
            start = Math.min(start, child.ordinal);
            end = Math.max(end, child.ordinal + child.length);
        });
        Object.defineProperty(this, 'ordinal', { value: start - (startDecrement || 0) });
        Object.defineProperty(this, 'length', { value: (lengthIncrement || 0) + end - start });
    };

    export default GenericNode;