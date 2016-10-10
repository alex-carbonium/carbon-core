export function left(outerBox, rect){
    return rect.x - outerBox.x;
}

export function right(outerBox, rect){
    return outerBox.x + outerBox.width - rect.x - rect.width;
}

export function top(outerBox, rect){
    return rect.y - outerBox.y;
}

export function bottom(outerBox, rect){
    return outerBox.y + outerBox.height - rect.y - rect.height;
}