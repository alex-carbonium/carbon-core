import {Types} from "./Defs";
import Matrix from "math/matrix";

var onAngleDistanceChanged = function (angle) {
    var angle = this._angle.value() * (Math.PI / 180);
    var x = Math.round(this._distance.value() * Math.cos(angle));
    var y = Math.round(this._distance.value() * Math.sin(angle));

    this._offsetX.value(x);
    this._offsetY.value(y);
};

var Shadow = {};
var matrix = new Matrix();
Shadow.apply = function (element, shadowObject, context, w, h, environment) {
    if (!shadowObject.enabled || shadowObject.color == null) {
        return;
    }

    context.save();

    var box = element.getBoundingBox(true);

    context.fillStyle = shadowObject.color;
    context.filter = "blur("+ (shadowObject.blur/2) + "px)";

    if (shadowObject.inset) {
        context.beginPath();
        element.drawPath(context, w, h);
        context.clip();

        context.translate(shadowObject.x, shadowObject.y);

        if(shadowObject.spread !== 0) {
            matrix.reset();
            matrix.scale((w - shadowObject.spread / 2) / w, (h - shadowObject.spread / 2) / h, w / 2 + shadowObject.x, h / 2 + shadowObject.y);
            matrix.applyToContext(context);
        }
        context.beginPath()
        var x = (element.props.x || 0) - 2 * Math.abs(shadowObject.x) - box.width;
        var y = (element.props.y || 0) - 2 * Math.abs(shadowObject.y) - box.height;
        var w2 = box.width * 3 + 4 * Math.abs(shadowObject.x);
        var h2 = box.height * 3 + 4 * Math.abs(shadowObject.y);
        context.rect(x + w2, y + h2, -w2, -h2);
        element.drawPath(context, w, h);
    } else {
        context.translate(shadowObject.x, shadowObject.y);

        if(shadowObject.spread !== 0) {
            matrix.reset();
            matrix.scale((w + shadowObject.spread / 2) / w, (h + shadowObject.spread / 2) / h, w / 2 + shadowObject.x, h / 2 + shadowObject.y);
            matrix.applyToContext(context);
        }

        context.beginPath();
        element.drawPath(context, w, h);
    }

    context.fill2();
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

Shadow.create = function (offsetX, offsetY, blur, color, inset, spread) {
    return Shadow.createFromObject({x: offsetX, y: offsetY, color: color, blur: blur, inset:inset, spread: spread || 0});
};

Shadow.None = Shadow.create(0, 0, 0, 'black', false, 0);
Shadow.Default = Shadow.create(4, 4, 4, 'rgba(0,0,0,.25)', false, 0);

export default Shadow;