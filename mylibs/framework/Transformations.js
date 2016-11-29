export function toGlobalProps(element){
    var globalParts = element.globalViewMatrix().decompose();
    var props = Object.assign({}, globalParts.translation);
    props.width = element.width();
    props.height = element.height();
    props.angle = globalParts.rotation;
    if (props.angle % 360){
        var pos = sketch.math2d.rotatePoint(props, props.angle * Math.PI / 180, element.rotationOrigin(true));
        Object.assign(props, pos);
    }
    return props;
}