import {Types} from "./Defs";

define(["framework/TypeDefaults"], function(TypeDefaults){
    var Quad = sketch.framework.QuadAndLock = {};

    var defaults = {
        bottomLeft: 0,
        bottomRight: 0,
        upperLeft: 0,
        upperRight: 0,
        locked: true
    };

    function QuadAndLockType(){
        this.t = Types.QuadAndLock;
    }

    QuadAndLockType.prototype = defaults;
    var quadAndLockTypeDefault =  TypeDefaults[Types.QuadAndLock] = function(){return new QuadAndLockType();}


    Quad.createFromObject = function(obj){
        return Object.assign(quadAndLockTypeDefault(), obj);
    };

    Quad.extend = function(...quads){
        return Quad.createFromObject(Object.assign({}, ...quads));
    };

    Quad.hasAnyValue = function(q){
        return q.bottomLeft || q.bottomRight || q.upperLeft || q.upperRight;
    };

    Quad.Default = Quad.createFromObject({});

    return Quad;
});