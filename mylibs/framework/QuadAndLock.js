define(["framework/ObjectCache", "framework/PropertyTypes", "framework/TypeDefaults"], function(ObjectCache, PropertyTypes, TypeDefaults){
    var Quad = sketch.framework.QuadAndLock = {};

    var defaults = {
        bottomLeft: 0,
        bottomRight: 0,
        upperLeft: 0,
        upperRight: 0,
        locked: true
    };

    function QuadAndLockType(){
        this.__type__ = "sketch.framework.QuadAndLock";
    }

    QuadAndLockType.prototype = defaults;
    var quadAndLockTypeDefault =  TypeDefaults["sketch.framework.QuadAndLock"] = function(){return new QuadAndLockType();}


    Quad.createFromObject = function(obj){
        return Object.assign(quadAndLockTypeDefault(), obj);
    };

    Quad.hasAnyValue =function(q){
        return q.bottomLeft || q.bottomRight || q.upperLeft || q.upperRight;
    };

    Quad.Default = Quad.createFromObject({});

    //PropertyTypes.quadAndLock.defaultValue = Quad.Default;

    return Quad;
});