var cache = {};


export function measureText(context, text) {
    var font = context.font;
    var c = cache[font] = cache[font] || {};

    var res = c[text];
    if(!res) {
        res = c[text] = context.measureText(text);
    }

    return res;
}