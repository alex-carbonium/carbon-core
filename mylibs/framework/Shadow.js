import {Types} from "./Defs";

var onAngleDistanceChanged = function (angle) {
    var angle = this._angle.value() * (Math.PI / 180);
    var x = Math.round(this._distance.value() * Math.cos(angle));
    var y = Math.round(this._distance.value() * Math.sin(angle));

    this._offsetX.value(x);
    this._offsetY.value(y);
};

var Shadow = {};

Shadow.apply = function (element, shadowObject, context, w, h, environment) {
    if (!shadowObject.enabled || shadowObject.color == null) {
        return;
    }

    var scale = environment.view.scale();
    context.save();
    context.shadowOffsetX = shadowObject.x * scale;
    context.shadowOffsetY = shadowObject.y * scale;
    context.shadowBlur = shadowObject.blur * scale;
    context.shadowColor = shadowObject.color;
    context.fillStyle = shadowObject.color;


    // element.parent().globalViewMatrix().applyToContext(context);

    context.beginPath();
    element.drawPath(context, w, h);
    if (shadowObject.inset) {
        context.clip();

        var box = element.getBoundingBox(true);
        context.beginPath()
        var x = (element.props.x || 0) - 2 * Math.abs(shadowObject.x) - box.width;
        var y = (element.props.y || 0) - 2 * Math.abs(shadowObject.y) - box.height;
        var w2 = box.width * 3 + 4 * Math.abs(shadowObject.x);
        var h2 = box.height * 3 + 4 * Math.abs(shadowObject.y);
        context.rect(x + w2, y + h2, -w2, -h2);
        element.drawPath(context, w, h);

    }
    context.fill2();
   // context.fill();
    context.restore();
}

Shadow.defaults = {
    t: Types.Shadow,
    x: 0,
    y: 0,
    blur: 0,
    spread: 0,
    enabled: true,
    inset: false,
    color: 0
};

Shadow.createFromObject = function (obj) {
    return Object.assign({}, Shadow.defaults, obj);
};

Shadow.create = function (offsetX, offsetY, color, blur) {
    return Shadow.createFromObject({x: offsetX, y: offsetY, color: color, blur: blur});
};

Shadow.None = Shadow.create(0, 0, 'black', 0);
Shadow.Default = Shadow.create(4, 4, 'black', 4);

export default Shadow;