define(["framework/Properties", "framework/ObjectCache", "framework/validation/MinMax"], function(Properties, ObjectCache, MinMax) {
    var fwk = sketch.framework;

    var onAngleDistanceChanged = function(angle){
        var angle = this._angle.value() * (Math.PI / 180);
        var x = Math.round(this._distance.value() * Math.cos(angle));
        var y = Math.round(this._distance.value() * Math.sin(angle));

        this._offsetX.value(x);
        this._offsetY.value(y);
    };

    fwk.Shadow  = {};

    fwk.Shadow.apply = function(shadowObject, context, callback) {
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

    fwk.Shadow.defaults = {
        __type__: "sketch.framework.Shadow",
        offsetX: 0,
        offsetY: 0,
        blur: 0,
        visible: true,
        color: 0,
        angle: 0,
        distance: 0
    };

    //temp upgrade from brushes to colors
    function upgrade(obj){
        if (obj.hasOwnProperty("color.value")){
            obj.color = obj["color.value"];
        }
        delete obj["color.value"];
        delete obj["color.type"];
        return obj;
    }
    fwk.Shadow.createFromObject = function(obj){
        obj = upgrade(obj);
        return Object.assign({}, fwk.Shadow.defaults, obj);
    };

    fwk.Shadow.create = function(offsetX, offsetY, color, blur){
        return fwk.Shadow.createFromObject({offsetX: offsetX, offsetY: offsetY, color: color, blur: blur});
    };

    fwk.Shadow.None = fwk.Shadow.create(0, 0, 'black', 0);

    return fwk.Shadow;
});