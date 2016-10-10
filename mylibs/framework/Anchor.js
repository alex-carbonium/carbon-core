define(["framework/Properties", "framework/ObjectCache", "framework/TypeDefaults"], function(Properties, ObjectCache, TypeDefaults) {
    var Anchor = sketch.framework.Anchor = {};

    var defaults = {
        left: true,
        top: true,
        right: false,
        bottom: false
    };
    function AnchorType(){
        this.__type__ = "sketch.framework.Anchor";
    }
    AnchorType.prototype = defaults;

    var anchorDefault = TypeDefaults["sketch.framework.Anchor"] = function(){return new AnchorType()};

    Anchor.hashKey = function(values){
        return JSON.stringify(extend(anchorDefault(), values));
    };

    Anchor.createFromObject = function(obj){
        return Object.assign(anchorDefault(), obj);
    };

    Anchor.toArray = function(anchor) {
        return [anchor.left, anchor.top, anchor.right, anchor.bottom];
    }

    Anchor.create = function(left, top, right, bottom){
        return Object.assign(anchorDefault(), {left: left, top: top, right: right, bottom: bottom});
    };

    Anchor.Default = Anchor.createFromObject({});

    Anchor.All = Anchor.create(true, true, true, true);

    return Anchor;
});