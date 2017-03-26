import {Types, HorizontalConstraint, VerticalConstraint} from "./Defs";

define(["framework/TypeDefaults"], function(TypeDefaults) {
    var Constraints = {};

    var defaults = {
        v: VerticalConstraint.Top,
        h: HorizontalConstraint.Left
    };

    function ConstraintsType(){
        this.t = Types.Constraints;
    }
    ConstraintsType.prototype = defaults;

    var constraintsDefault = TypeDefaults[Types.Constraints] = function(){return new ConstraintsType()};

    Constraints.hashKey = function(values){
        return JSON.stringify(extend(constraintsDefault(), values));
    };

    Constraints.createFromObject = function(obj){
        return Object.assign(constraintsDefault(), obj);
    };

    Constraints.toArray = function(constraints) {
        return [constraints.v, constraints.h];
    }

    Constraints.create = function(h, v){
        return Object.assign(constraintsDefault(), {v:v, h:h});
    };

    Constraints.Default = Constraints.createFromObject({});

    Constraints.All = Constraints.create(HorizontalConstraint.LeftRight, VerticalConstraint.TopBottom);

    Constraints.StretchAll = Constraints.create(HorizontalConstraint.Stretch, VerticalConstraint.Stretch);

    return Constraints;
});