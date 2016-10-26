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
    if (!shadowObject.visible || (shadowObject.blur == 0 && shadowObject.distance == 0) || shadowObject.color == null){
        return;
    }

    context.save();
    context.shadowOffsetX = shadowObject.offsetX;
    context.shadowOffsetY = shadowObject.offsetY;
    context.shadowBlur = shadowObject.blur;
    context.shadowColor = shadowObject.color;
    callback(context);
    context.restore();
}

Shadow.defaults = {
    t: Types.Shadow,
    offsetX: 0,
    offsetY: 0,
    blur: 0,
    visible: true,
    color: 0,
    angle: 0,
    distance: 0
};

Shadow.createFromObject = function(obj){
    return Object.assign({}, Shadow.defaults, obj);
};

Shadow.create = function(offsetX, offsetY, color, blur){
    return Shadow.createFromObject({offsetX: offsetX, offsetY: offsetY, color: color, blur: blur});
};

Shadow.None = Shadow.create(0, 0, 'black', 0);

export default Shadow;