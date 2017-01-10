export function fitRect(source, target, noScaleUp){
    return fitOrFill(source, target, noScaleUp, true);
}
export function fillRect(source, target, noScaleUp){
    return fitOrFill(source, target, noScaleUp, false);
}

function fitOrFill(source, target, noScaleUp, fit){
    var pw = target.width / source.width;
    var ph = target.height / source.height;

    var p;
    if (fit){
        p = ph < pw ? ph : pw;
    }
    else{
        p = ph > pw ? ph : pw;
    }

    if (p > 1 && noScaleUp)
        return {width: source.width, height: source.height};

    var w2 = source.width * p;
    var h2 = source.height * p;
    return {
        x: target.x + (target.width - w2)/2,
        y: target.y + (target.height - h2)/2,
        width: w2,
        height: h2
    };
}