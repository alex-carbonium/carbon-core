import {Types} from "./Defs";

var onAngleDistanceChanged = function(angle){
    var angle = this._angle.value() * (Math.PI / 180);
    var x = Math.round(this._distance.value() * Math.cos(angle));
    var y = Math.round(this._distance.value() * Math.sin(angle));

    this._offsetX.value(x);
    this._offsetY.value(y);
};

var Shadow = {};

Shadow.apply = function(shadowObject, context, callback){
    if (!shadowObject.enabled || (shadowObject.blur == 0 && shadowObject.spread == 0) || shadowObject.color == null){
        return;
    }

    context.save();
    context.shadowOffsetX = shadowObject.x;
    context.shadowOffsetY = shadowObject.y;
    context.shadowBlur = shadowObject.blur;
    context.shadowColor = shadowObject.color;
    callback(context);
    context.restore();
}

Shadow.defaults = {
    t: Types.Shadow,
    x   : 0,
    y   : 0,
    blur: 0,
    spread: 0,
    enabled: true,
    inset: true,
    color: 0
};

Shadow.createFromObject = function(obj){
    return Object.assign({}, Shadow.defaults, obj);
};

Shadow.create = function(offsetX, offsetY, color, blur){
    return Shadow.createFromObject({x: offsetX, y: offsetY, color: color, blur: blur});
};

Shadow.None = Shadow.create(0, 0, 'black', 0);
Shadow.Default = Shadow.create(4, 4, 'black', 4);

export default Shadow;