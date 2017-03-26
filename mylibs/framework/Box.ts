import {Types} from "./Defs";

define(["framework/TypeDefaults"], function(TypeDefaults) {
    var Box = sketch.framework.Box = {};

    var defaults = {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0
    };

    function BoxType(){
        this.t = Types.Box;
    }
    BoxType.prototype = defaults;

    var boxDefault = TypeDefaults[Types.Box] = function(){return new BoxType();};

    Box.createFromObject = function(obj){
        return Object.assign(boxDefault(), obj);
    };

    Box.create = function(left, top, right, bottom){
        return Box.createFromObject({left: left, top: top, right: right, bottom: bottom});
    };

    Box.Default = Box.createFromObject({});

    return Box;
});